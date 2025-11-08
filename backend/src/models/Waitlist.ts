import mongoose, { Model, Schema } from "mongoose";

export interface IWaitlist {
  email: string;
  companyName?: string;
  role?: string;
  teamSize?: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WaitlistSchema = new Schema<IWaitlist>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    companyName: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      trim: true,
    },
    teamSize: {
      type: String,
      enum: ["1-5", "6-20", "21-50", "51-200", "200+", ""],
    },
    source: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Waitlist: Model<IWaitlist> = mongoose.model<IWaitlist>("Waitlist", WaitlistSchema);

export default Waitlist;
