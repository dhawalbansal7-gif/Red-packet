export type UserRole = 'pending' | 'sponsor' | 'manager' | 'admin';
export type ApprovalStatus = 'Waiting for Approval' | 'approved' | 'rejected' | 'suspended';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  createdAt: any; // Timestamp
  lastLogin?: any; // Timestamp
  totalInvites?: number;
  redPacketsGiven?: number;
  redPacketsToBeGiven?: number;
}

export type PacketType =
  | '600 Coins Red Packet'
  | '1800 Coins Red Packet'
  | '3000 Coins Red Packet'
  | '10,000 Coins Red Packet';

export type PacketStatus = 'Pending' | 'Given' | 'Sharing Soon';

export interface Packet {
  id: string;
  sponsorId: string;
  sponsorName: string;
  type: PacketType;
  status: PacketStatus;
  amount: number;
  createdAt: any;
  assignedBy: string; // Name or UID of person who assigned it
  notes?: string;
}

export interface Invite {
  id: string;
  managerId: string;
  managerName: string;
  sponsorEmail: string;
  sponsorName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  createdAt: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
}
