export enum ActionType {
  PASSWORD_CHANGE = "PASSWORD_CHANGE",
  PROFILE_UPDATE = "PROFILE_UPDATE",
  ACCOUNT_DELETION = "ACCOUNT_DELETION",
  SENSITIVE_ACTION = "SENSITIVE_ACTION",
}

export const ACTION_CONFIRMATION_MESSAGES: Record<
  ActionType,
  { subject: string; title: string; description: string }
> = {
  [ActionType.PASSWORD_CHANGE]: {
    subject: "Confirm Password Change",
    title: "Password Change Request",
    description:
      "You are attempting to change your password. Please use the code below to confirm this change.",
  },
  [ActionType.PROFILE_UPDATE]: {
    subject: "Confirm Profile Update",
    title: "Profile Update Request",
    description:
      "You are updating sensitive information on your profile. Please use the code below to confirm this update.",
  },
  [ActionType.ACCOUNT_DELETION]: {
    subject: "Confirm Account Deletion",
    title: "Account Deletion Request",
    description:
      "You are about to delete your account. This action is irreversible. Please use the code below to confirm.",
  },
  [ActionType.SENSITIVE_ACTION]: {
    subject: "Confirm Sensitive Action",
    title: "Action Confirmation Required",
    description:
      "A sensitive action has been initiated on your account. Please use the code below to confirm.",
  },
};

export const SENSITIVE_ACTION_DURATION_MINUTES = 15;
