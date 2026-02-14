import mongoose, { Document, Schema } from "mongoose";

/**
 * Counter Model - Atomic sequence generation
 * Used for generating unique sequential numbers (e.g., ticket numbers)
 */

export interface ICounter {
    _id: string; // e.g., "ticket_<workspaceId>"
    seq: number;
}

const counterSchema = new Schema<ICounter>({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

const Counter = mongoose.model<ICounter>("Counter", counterSchema);
export default Counter;
