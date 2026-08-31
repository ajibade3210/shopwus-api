export interface Attachment {
  content?: string | Buffer;
  filename?: string | false | undefined;
  path?: string;
  contentType?: string;
  contentId?: string;
}

export interface Tag {
  name: string;
  value: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Attachment[];
  tags?: Tag[];
}

export interface SendTemplateOptions extends Omit<SendEmailOptions, "html"> {
  template: string;
  context: Record<string, unknown>;
}
