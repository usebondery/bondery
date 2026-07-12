import type { ChannelType } from "#primitives/channel/types.js";

export type ContactType = ChannelType;

export interface PhoneEntry {
  preferred: boolean;
  prefix: string;
  type: ChannelType;
  value: string;
}

export interface EmailEntry {
  preferred: boolean;
  type: ChannelType;
  value: string;
}

export interface PhoneEntryInput {
  preferred: boolean;
  prefix: string;
  type: ChannelType;
  value: string;
}

export interface EmailEntryInput {
  preferred: boolean;
  type: ChannelType;
  value: string;
}

export interface ShareContactEmailInput {
  message?: string;
  recipients: string[];
}
