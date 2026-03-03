import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Waitlist, WaitlistDocument } from './schemas/waitlist.schema';
import { EventsGateway } from '../events/events.gateway';
import { QrTokenService } from '../qr-token/qr-token.service';
import { BusinessService } from '../business/business.service';
import { checkGeoFence } from '../common/utils/geo.util';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectModel(Waitlist.name) private waitlistModel: Model<WaitlistDocument>,
    private eventsGateway: EventsGateway,
    private qrTokenService: QrTokenService,
    private businessService: BusinessService,
  ) {}

  async findAll(businessId: string, query: any) {
    const { status, page = 1, limit = 20 } = query;
    const filter: any = { businessId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.waitlistModel.find(filter).skip(skip).limit(+limit).sort({ createdAt: 1 }).populate('tableId'),
      this.waitlistModel.countDocuments(filter),
    ]);
    return { data, total, page: +page, totalPages: Math.ceil(total / +limit) };
  }

  async getTodayWaitlist(businessId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.waitlistModel.find({
      businessId,
      createdAt: { $gte: today, $lt: tomorrow },
    }).sort({ createdAt: 1 }).populate('tableId');
  }

  async findOne(id: string) {
    const entry = await this.waitlistModel.findById(id).populate('tableId');
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    return entry;
  }

  async getPosition(id: string) {
    const entry = await this.waitlistModel.findById(id);
    if (!entry) throw new NotFoundException('Waitlist entry not found');

    // Count entries ahead using the stored position field for consistency
    // with broadcastPositionShifts which renumbers by position
    const ahead = await this.waitlistModel.countDocuments({
      businessId: entry.businessId,
      status: 'waiting',
      position: { $lt: entry.position },
    });

    const totalWaiting = await this.waitlistModel.countDocuments({
      businessId: entry.businessId,
      status: 'waiting',
    });

    const position = entry.status === 'waiting' ? ahead + 1 : 0;

    return {
      position,
      totalWaiting,
      status: entry.status,
      customerName: entry.customerName,
      partySize: entry.partySize,
      estimatedWait: position * 5,
    };
  }

  async create(businessId: string, data: any) {
    const position = await this.getNextPosition(businessId);
    const entry = await this.waitlistModel.create({ ...data, businessId, position });

    const accessToken = this.qrTokenService.generateAccessToken(entry._id.toString(), 'waitlist');
    entry.accessToken = accessToken;
    await entry.save();

    const totalWaiting = await this.waitlistModel.countDocuments({
      businessId,
      status: 'waiting',
    });

    this.eventsGateway.emitQueueNew(businessId, entry, totalWaiting);

    return entry;
  }

  /**
   * Public queue join via QR scan.
   * Validates: token → geofence → duplicate check → assigns position.
   */
  async createFromQr(dto: {
    token: string;
    latitude?: number;
    longitude?: number;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    partySize?: number;
    notes?: string;
  }) {
    // 1. Decode token to get shopId
    const decoded = this.qrTokenService.decodeQrEntryToken(dto.token);
    const shopId = decoded.sub;

    // 2. Look up business
    const business = await this.businessService.getBusiness(shopId);

    // 3. Verify token signature with shop's secret
    this.qrTokenService.verifyQrEntryToken(dto.token, business.qrTokenSecret);

    // 4. Geofence check (only if shop has GPS coordinates set)
    const hasGeo =
      business.geoLocation?.coordinates?.[0] !== 0 ||
      business.geoLocation?.coordinates?.[1] !== 0;

    if (hasGeo) {
      if (dto.latitude == null || dto.longitude == null) {
        throw new ForbiddenException(
          'Location permission is required. Please allow location access and try again.',
        );
      }

      const { allowed, distance } = checkGeoFence(
        dto.latitude,
        dto.longitude,
        business.geoLocation.coordinates[0], // longitude
        business.geoLocation.coordinates[1], // latitude
        business.geoFenceRadius,
      );

      if (!allowed) {
        throw new ForbiddenException(
          `You must be within ${business.geoFenceRadius}m of the shop to join the queue. You are currently ${distance}m away.`,
        );
      }
    }

    // 5. Calculate next position
    const position = await this.getNextPosition(shopId);

    // 6. Create entry (partial unique index prevents duplicates automatically)
    let entry;
    try {
      entry = await this.waitlistModel.create({
        businessId: shopId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone || '',
        customerEmail: dto.customerEmail || '',
        partySize: dto.partySize || 1,
        notes: dto.notes || '',
        position,
        status: 'waiting',
      });
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(
          'You already have an active entry in this queue.',
        );
      }
      throw error;
    }

    // 7. Generate access token for status tracking
    const accessToken = this.qrTokenService.generateAccessToken(
      entry._id.toString(),
      'waitlist',
    );
    entry.accessToken = accessToken;
    await entry.save();

    // 8. Emit real-time events
    const totalWaiting = await this.waitlistModel.countDocuments({
      businessId: shopId,
      status: 'waiting',
    });

    this.eventsGateway.emitQueueNew(shopId, entry, totalWaiting);
    this.eventsGateway.emitQueueJoined(entry._id.toString(), position, position * 5);

    return {
      entryId: entry._id,
      position,
      estimatedWait: position * 5,
      accessToken,
      status: entry.status,
      businessName: business.name,
    };
  }

  /**
   * Get the next position number for a business's active queue.
   */
  private async getNextPosition(businessId: string): Promise<number> {
    const lastEntry = await this.waitlistModel
      .findOne({ businessId, status: { $in: ['waiting', 'approved', 'serving'] } })
      .sort({ position: -1 })
      .select('position');

    return (lastEntry?.position || 0) + 1;
  }

  async updateStatus(id: string, status: string) {
    const entry = await this.waitlistModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!entry) throw new NotFoundException('Waitlist entry not found');

    const businessId = entry.businessId.toString();
    this.eventsGateway.emitQueueUpdate(businessId, entry, status);

    if (status === 'cancelled' || status === 'completed') {
      this.eventsGateway.emitQueueRemove(businessId, id);
      await this.broadcastPositionShifts(businessId);
    }

    return entry;
  }

  async update(id: string, data: any) {
    return this.waitlistModel.findByIdAndUpdate(id, data, { new: true });
  }

  async remove(id: string) {
    const entry = await this.waitlistModel.findByIdAndDelete(id);
    if (entry) {
      const businessId = entry.businessId.toString();
      this.eventsGateway.emitQueueRemove(businessId, id);
      await this.broadcastPositionShifts(businessId);
    }
    return entry;
  }

  async approve(id: string) {
    const entry = await this.waitlistModel.findByIdAndUpdate(
      id,
      { status: 'approved', approvedAt: new Date() },
      { new: true },
    );
    if (!entry) throw new NotFoundException('Waitlist entry not found');

    const businessId = entry.businessId.toString();
    this.eventsGateway.emitQueueApproved(id, entry);
    this.eventsGateway.emitQueueUpdate(businessId, entry, 'approved');

    return entry;
  }

  async reject(id: string, reason: string) {
    const entry = await this.waitlistModel.findByIdAndUpdate(
      id,
      { status: 'rejected', rejectedReason: reason },
      { new: true },
    );
    if (!entry) throw new NotFoundException('Waitlist entry not found');

    const businessId = entry.businessId.toString();
    this.eventsGateway.emitQueueRejected(id, entry, reason);
    this.eventsGateway.emitQueueUpdate(businessId, entry, 'rejected');
    await this.broadcastPositionShifts(businessId);

    return entry;
  }

  /**
   * Call the next person in the queue.
   * Uses optimistic locking (version field) to prevent two admins
   * from processing the same entry simultaneously.
   */
  async callNext(businessId: string, adminId: string) {
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Find the next waiting entry by position
      const entry = await this.waitlistModel
        .findOne({ businessId, status: 'waiting' })
        .sort({ position: 1 });

      if (!entry) {
        throw new NotFoundException('No entries waiting in the queue');
      }

      // Atomic update with version check — this IS the lock
      const updated = await this.waitlistModel.findOneAndUpdate(
        {
          _id: entry._id,
          version: entry.version,
          status: 'waiting',
        },
        {
          $set: {
            status: 'serving',
            processedBy: adminId,
            processedAt: new Date(),
          },
          $inc: { version: 1 },
        },
        { new: true },
      );

      if (updated) {
        const entryId = updated._id.toString();
        this.eventsGateway.emitQueueCalled(entryId, updated);
        this.eventsGateway.emitQueueUpdate(businessId, updated, 'called');
        await this.broadcastPositionShifts(businessId);

        return updated;
      }

      // Version mismatch — another admin got this one, retry with next entry
    }

    throw new ConflictException(
      'Queue is being processed by another admin. Please retry.',
    );
  }

  /**
   * Seat an approved entry — transitions approved → serving.
   */
  async seat(id: string, businessId: string, adminId: string) {
    const entry = await this.waitlistModel.findById(id);
    if (!entry) throw new NotFoundException('Waitlist entry not found');

    const updated = await this.waitlistModel.findOneAndUpdate(
      {
        _id: id,
        version: entry.version,
        status: 'approved',
      },
      {
        $set: {
          status: 'serving',
          processedBy: adminId,
          processedAt: new Date(),
        },
        $inc: { version: 1 },
      },
      { new: true },
    );

    if (!updated) {
      throw new ConflictException(
        'Entry was modified by another admin. Please refresh.',
      );
    }

    const entryId = updated._id.toString();
    this.eventsGateway.emitQueueCalled(entryId, updated);
    this.eventsGateway.emitQueueUpdate(businessId, updated, 'called');
    await this.broadcastPositionShifts(businessId);

    return updated;
  }

  /**
   * Skip a queue entry. Moves it to the back or marks as skipped.
   */
  async skip(id: string, businessId: string, adminId: string) {
    const entry = await this.waitlistModel.findById(id);
    if (!entry) throw new NotFoundException('Waitlist entry not found');

    const updated = await this.waitlistModel.findOneAndUpdate(
      {
        _id: id,
        version: entry.version,
        status: { $in: ['waiting', 'approved'] },
      },
      {
        $set: {
          status: 'cancelled',
          processedBy: adminId,
          processedAt: new Date(),
          rejectedReason: 'Skipped by admin',
        },
        $inc: { version: 1 },
      },
      { new: true },
    );

    if (!updated) {
      throw new ConflictException(
        'This entry was already processed by another admin.',
      );
    }

    this.eventsGateway.emitQueueSkipped(id, updated, 'Skipped by admin');
    this.eventsGateway.emitQueueUpdate(businessId, updated, 'skipped');
    await this.broadcastPositionShifts(businessId);

    return updated;
  }

  /**
   * Mark a serving entry as completed.
   */
  async complete(id: string, businessId: string) {
    const entry = await this.waitlistModel.findById(id);
    if (!entry) throw new NotFoundException('Waitlist entry not found');

    const updated = await this.waitlistModel.findOneAndUpdate(
      {
        _id: id,
        version: entry.version,
        status: 'serving',
      },
      {
        $set: { status: 'completed' },
        $inc: { version: 1 },
      },
      { new: true },
    );

    if (!updated) {
      throw new ConflictException(
        'This entry was already processed by another admin.',
      );
    }

    this.eventsGateway.emitQueueRemove(businessId, id);
    await this.broadcastPositionShifts(businessId);

    return updated;
  }

  /**
   * Recalculate positions for all waiting entries and notify each customer.
   * Called after callNext, skip, or cancel shifts the queue.
   */
  private async broadcastPositionShifts(businessId: string) {
    const waitingEntries = await this.waitlistModel
      .find({ businessId, status: 'waiting' })
      .sort({ position: 1 });

    for (let i = 0; i < waitingEntries.length; i++) {
      const newPosition = i + 1;
      const entry = waitingEntries[i];

      // Update stored position if it drifted
      if (entry.position !== newPosition) {
        await this.waitlistModel.updateOne(
          { _id: entry._id },
          { $set: { position: newPosition } },
        );
      }

      this.eventsGateway.emitQueuePositionUpdate(
        entry._id.toString(),
        newPosition,
        newPosition * 5,
      );
    }

    this.eventsGateway.emitQueuePositionsShifted(
      businessId,
      waitingEntries.map((e, i) => ({
        _id: e._id.toString(),
        position: i + 1,
        customerName: e.customerName,
      })),
    );
  }

  async findByAccessToken(token: string) {
    const payload = this.qrTokenService.verifyToken(token);
    if (payload.type !== 'waitlist') {
      throw new UnauthorizedException('Invalid token type');
    }
    const entry = await this.waitlistModel.findById(payload.sub).populate('tableId');
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    return entry;
  }

  async cancelByCustomer(id: string, token: string) {
    if (!token) {
      throw new UnauthorizedException('Access token is required to cancel your entry');
    }
    const payload = this.qrTokenService.verifyToken(token);
    if (payload.sub !== id) {
      throw new UnauthorizedException('Token does not match waitlist entry');
    }
    const entry = await this.waitlistModel.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true });
    if (!entry) throw new NotFoundException('Waitlist entry not found');

    const businessId = entry.businessId.toString();
    this.eventsGateway.emitQueueCancelled(businessId, id, entry);
    await this.broadcastPositionShifts(businessId);

    return entry;
  }
}
