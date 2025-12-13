import mongoose, { Schema, Document } from "mongoose";

// User schema
export interface IUser extends Document {
  email: string;
  twitterUserId: string;
  twitterUsername?: string;
  twitterAccessToken: string;
  twitterRefreshToken?: string;
  tokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
    },
    twitterUserId: {
      type: String,
      required: true,
      unique: true,
    },
    twitterUsername: String,
    twitterAccessToken: {
      type: String,
      required: true,
    },
    twitterRefreshToken: String,
    tokenExpiresAt: Date,
  },
  { timestamps: true }
);

// Tweet Queue schema
export interface ITweetQueue extends Document {
  userId: mongoose.Types.ObjectId;
  content: string;
  mediaUrl?: string;
  scheduledAt: Date;
  status: "pending" | "posted" | "failed";
  postedAt?: Date;
  twitterTweetId?: string;
  retryCount: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tweetQueueSchema = new Schema<ITweetQueue>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    mediaUrl: String,
    scheduledAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "posted", "failed"],
      default: "pending",
    },
    postedAt: Date,
    twitterTweetId: String,
    retryCount: {
      type: Number,
      default: 0,
    },
    errorMessage: String,
  },
  { timestamps: true }
);

// User Prefs schema
export interface IUserPrefs extends Document {
  userId: mongoose.Types.ObjectId;
  dailyPostTime: string;
  autoPostEnabled: boolean;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const userPrefsSchema = new Schema<IUserPrefs>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    dailyPostTime: {
      type: String,
      default: "20:00",
    },
    autoPostEnabled: {
      type: Boolean,
      default: false,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export const TweetQueue =
  mongoose.models.TweetQueue ||
  mongoose.model<ITweetQueue>("TweetQueue", tweetQueueSchema);

export const UserPrefs =
  mongoose.models.UserPrefs ||
  mongoose.model<IUserPrefs>("UserPrefs", userPrefsSchema);
