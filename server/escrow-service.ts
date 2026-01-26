/**
 * Escrow Service
 * Handles fund locking, release, and dispute holds
 * ZIBA WALLET + ESCROW MODEL
 */

import { db } from "./db";
import { escrows, riderWallets, driverWallets, zibaWallet, financialAuditLogs, riderTransactionHistory } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface LockEscrowParams {
  rideId: string;
  riderId: string;
  amount: number;
  currency?: string;
}

export interface ReleaseEscrowParams {
  escrowId: string;
  driverId: string;
  finalFare: number;
  platformCommission: number;
}

export interface HoldEscrowParams {
  escrowId: string;
  disputeId: string;
}

export const escrowService = {
  async lockFunds(params: LockEscrowParams): Promise<{ success: boolean; escrowId?: string; error?: string }> {
    const { rideId, riderId, amount, currency = "USD" } = params;
    
    try {
      const riderWallet = await db
        .select()
        .from(riderWallets)
        .where(eq(riderWallets.userId, riderId))
        .limit(1);
      
      if (!riderWallet.length) {
        const [newWallet] = await db.insert(riderWallets).values({
          userId: riderId,
          currency,
        }).returning();
        
        if (!newWallet) {
          return { success: false, error: "Failed to create rider wallet" };
        }
      }
      
      const wallet = riderWallet[0] || (await db.select().from(riderWallets).where(eq(riderWallets.userId, riderId)).limit(1))[0];
      
      const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);
      if (availableBalance < amount) {
        return { success: false, error: "Insufficient funds in wallet" };
      }
      
      await db
        .update(riderWallets)
        .set({
          lockedBalance: sql`${riderWallets.lockedBalance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(riderWallets.userId, riderId));
      
      const [escrow] = await db.insert(escrows).values({
        rideId,
        riderId,
        amount: amount.toString(),
        status: "locked",
        lockedAt: new Date(),
      }).returning();
      
      await db.insert(financialAuditLogs).values({
        rideId,
        userId: riderId,
        actorRole: "RIDER",
        eventType: "ESCROW_LOCK",
        amount: amount.toString(),
        currency,
        description: `Escrow locked for ride ${rideId}`,
      });
      
      await db.insert(riderTransactionHistory).values({
        riderId,
        type: "hold",
        amount: amount.toString(),
        source: "trip",
        referenceId: rideId,
        description: `Escrow locked for ride`,
      });
      
      return { success: true, escrowId: escrow.id };
    } catch (error) {
      console.error("Error locking escrow:", error);
      return { success: false, error: "Failed to lock funds" };
    }
  },
  
  async releaseFunds(params: ReleaseEscrowParams): Promise<{ success: boolean; error?: string }> {
    const { escrowId, driverId, finalFare, platformCommission } = params;
    
    try {
      const [escrow] = await db
        .select()
        .from(escrows)
        .where(and(eq(escrows.id, escrowId), eq(escrows.status, "locked")))
        .limit(1);
      
      if (!escrow) {
        return { success: false, error: "Escrow not found or not in locked state" };
      }
      
      const driverEarning = finalFare - platformCommission;
      
      await db
        .update(riderWallets)
        .set({
          balance: sql`${riderWallets.balance} - ${finalFare}`,
          lockedBalance: sql`${riderWallets.lockedBalance} - ${parseFloat(escrow.amount)}`,
          updatedAt: new Date(),
        })
        .where(eq(riderWallets.userId, escrow.riderId));
      
      const existingDriverWallet = await db
        .select()
        .from(driverWallets)
        .where(eq(driverWallets.userId, driverId))
        .limit(1);
      
      if (!existingDriverWallet.length) {
        await db.insert(driverWallets).values({
          userId: driverId,
        });
      }
      
      await db
        .update(driverWallets)
        .set({
          pendingBalance: sql`${driverWallets.pendingBalance} + ${driverEarning}`,
          updatedAt: new Date(),
        })
        .where(eq(driverWallets.userId, driverId));
      
      const existingZibaWallet = await db.select().from(zibaWallet).limit(1);
      if (!existingZibaWallet.length) {
        await db.insert(zibaWallet).values({});
      }
      
      await db
        .update(zibaWallet)
        .set({
          commissionBalance: sql`${zibaWallet.commissionBalance} + ${platformCommission}`,
          updatedAt: new Date(),
        });
      
      await db
        .update(escrows)
        .set({
          status: "released",
          releasedAt: new Date(),
          releaseToDriverId: driverId,
          releaseAmount: driverEarning.toString(),
          platformAmount: platformCommission.toString(),
          updatedAt: new Date(),
        })
        .where(eq(escrows.id, escrowId));
      
      await db.insert(financialAuditLogs).values({
        rideId: escrow.rideId,
        userId: driverId,
        actorRole: "SYSTEM",
        eventType: "ESCROW_RELEASE",
        amount: driverEarning.toString(),
        description: `Escrow released: Driver earning $${driverEarning}`,
      });
      
      await db.insert(financialAuditLogs).values({
        rideId: escrow.rideId,
        userId: "ZIBA",
        actorRole: "SYSTEM",
        eventType: "COMMISSION",
        amount: platformCommission.toString(),
        description: `Platform commission $${platformCommission}`,
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error releasing escrow:", error);
      return { success: false, error: "Failed to release funds" };
    }
  },
  
  async holdForDispute(params: HoldEscrowParams): Promise<{ success: boolean; error?: string }> {
    const { escrowId, disputeId } = params;
    
    try {
      const [escrow] = await db
        .select()
        .from(escrows)
        .where(eq(escrows.id, escrowId))
        .limit(1);
      
      if (!escrow) {
        return { success: false, error: "Escrow not found" };
      }
      
      await db
        .update(escrows)
        .set({
          status: "held",
          heldAt: new Date(),
          disputeId,
          updatedAt: new Date(),
        })
        .where(eq(escrows.id, escrowId));
      
      await db.insert(financialAuditLogs).values({
        rideId: escrow.rideId,
        userId: escrow.riderId,
        actorRole: "SYSTEM",
        eventType: "ESCROW_HOLD",
        amount: escrow.amount,
        description: `Escrow held for dispute ${disputeId}`,
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error holding escrow:", error);
      return { success: false, error: "Failed to hold funds" };
    }
  },
  
  async refundToRider(escrowId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const [escrow] = await db
        .select()
        .from(escrows)
        .where(eq(escrows.id, escrowId))
        .limit(1);
      
      if (!escrow) {
        return { success: false, error: "Escrow not found" };
      }
      
      await db
        .update(riderWallets)
        .set({
          lockedBalance: sql`${riderWallets.lockedBalance} - ${parseFloat(escrow.amount)}`,
          updatedAt: new Date(),
        })
        .where(eq(riderWallets.userId, escrow.riderId));
      
      await db
        .update(escrows)
        .set({
          status: "refunded",
          releasedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(escrows.id, escrowId));
      
      await db.insert(financialAuditLogs).values({
        rideId: escrow.rideId,
        userId: escrow.riderId,
        actorRole: "SYSTEM",
        eventType: "REFUND",
        amount: escrow.amount,
        description: `Full refund to rider`,
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error refunding escrow:", error);
      return { success: false, error: "Failed to refund" };
    }
  },
  
  async getEscrowByRideId(rideId: string) {
    const [escrow] = await db
      .select()
      .from(escrows)
      .where(eq(escrows.rideId, rideId))
      .limit(1);
    return escrow;
  },
  
  async moveToWithdrawable(driverId: string): Promise<{ success: boolean; amount?: number; error?: string }> {
    try {
      const [wallet] = await db
        .select()
        .from(driverWallets)
        .where(eq(driverWallets.userId, driverId))
        .limit(1);
      
      if (!wallet) {
        return { success: false, error: "Driver wallet not found" };
      }
      
      const pendingAmount = parseFloat(wallet.pendingBalance);
      if (pendingAmount <= 0) {
        return { success: false, error: "No pending balance to move" };
      }
      
      await db
        .update(driverWallets)
        .set({
          pendingBalance: "0.00",
          withdrawableBalance: sql`${driverWallets.withdrawableBalance} + ${pendingAmount}`,
          balance: sql`${driverWallets.balance} + ${pendingAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(driverWallets.userId, driverId));
      
      return { success: true, amount: pendingAmount };
    } catch (error) {
      console.error("Error moving to withdrawable:", error);
      return { success: false, error: "Failed to update balance" };
    }
  },
};
