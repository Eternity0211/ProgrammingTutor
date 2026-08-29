import { Role } from "@prisma/client";

export interface classCreation {
  name: string;
  section: string;
}

export interface UserClassroom {
  id: string;
  name: string;
  section: string;
  code: string;
  inviteLink: string;
  facultyName: string;
  createdAt: Date;
}

export interface Members {
  id: string;
  name: string;
  email: string;
  image: string;
  role: Role;
}
