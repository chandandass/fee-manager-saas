/**
 * WhatsApp reminder service.
 * V1: Opens WhatsApp with pre-filled message (no official API cost).
 * Later: Integrate WhatsApp Business API or providers like Wati / Interakt.
 */

export interface ReminderPayload {
  phone: string;
  studentName: string;
  amount: number;
  month: string;
  instituteName: string;
}

export class WhatsAppService {
  buildReminderMessage(payload: ReminderPayload): string {
    const { studentName, amount, month, instituteName } = payload;
    return (
      `Namaste 🙏\n\n` +
      `*${instituteName}* se message.\n\n` +
      `${studentName} ji ke ${month} ke fees pending hain.\n` +
      `Amount: ₹${amount}\n\n` +
      `Please jaldi payment kar den.\n` +
      `Dhanyavaad!`
    );
  }

  getReminderLink(payload: ReminderPayload): string {
    const phone = payload.phone.replace(/\D/g, "");
    const fullPhone = phone.length === 10 ? `91${phone}` : phone;
    const text = encodeURIComponent(this.buildReminderMessage(payload));
    return `https://wa.me/${fullPhone}?text=${text}`;
  }

  openReminder(payload: ReminderPayload) {
    if (typeof window !== "undefined") {
      window.open(this.getReminderLink(payload), "_blank");
    }
  }
}

export const whatsappService = new WhatsAppService();
