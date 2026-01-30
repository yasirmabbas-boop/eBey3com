import type { Express } from "express";
import { storage } from "../storage";
import { insertReportSchema } from "@shared/schema";
import { getUserIdFromRequest } from "./shared";
import { z } from "zod";
import nodemailer from "nodemailer";

function generateCaseNumber(): string {
  const prefix = "RPT";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

async function sendReportEmail(report: {
  caseNumber: string;
  reportType: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string | null;
  reporterPhone?: string;
  status: string;
}) {
  const ZOHO_EMAIL = process.env.ZOHO_EMAIL;
  const ZOHO_PASSWORD = process.env.ZOHO_PASSWORD;
  
  if (!ZOHO_EMAIL || !ZOHO_PASSWORD) {
    console.log("[Reports] Zoho credentials not configured, skipping email notification");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: {
        user: ZOHO_EMAIL,
        pass: ZOHO_PASSWORD,
      },
    });

    const htmlContent = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e11d48;">🚨 بلاغ جديد</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; width: 150px;">رقم القضية:</td>
            <td style="padding: 10px; color: #2563eb; font-weight: bold;">${report.caseNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold;">الحالة:</td>
            <td style="padding: 10px;">
              <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px;">
                قيد المراجعة
              </span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold;">نوع البلاغ:</td>
            <td style="padding: 10px;">${report.reportType}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold;">الهدف:</td>
            <td style="padding: 10px;">${report.targetType} (${report.targetId})</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold;">السبب:</td>
            <td style="padding: 10px;">${report.reason}</td>
          </tr>
          ${report.details ? `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold;">التفاصيل:</td>
            <td style="padding: 10px;">${report.details}</td>
          </tr>
          ` : ""}
          ${report.reporterPhone ? `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold;">هاتف المُبلّغ:</td>
            <td style="padding: 10px;">${report.reporterPhone}</td>
          </tr>
          ` : ""}
        </table>
        
        <p style="color: #6b7280; font-size: 14px;">
          يرجى مراجعة هذا البلاغ واتخاذ الإجراء المناسب.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          E-بيع Security Team
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"E-بيع Security" <${ZOHO_EMAIL}>`,
      to: "security@ebey3.com",
      subject: `[${report.caseNumber}] بلاغ جديد - ${report.reportType}`,
      html: htmlContent,
    });

    console.log("[Reports] Email sent successfully for case:", report.caseNumber);
  } catch (error) {
    console.error("[Reports] Error sending email:", error);
  }
}

export function registerReportsRoutes(app: Express): void {
  app.post("/api/reports", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لإرسال بلاغ" });
      }

      const parsed = insertReportSchema.parse({
        ...req.body,
        reporterId: userId,
      });

      const report = await storage.createReport(parsed);
      const caseNumber = generateCaseNumber();

      const user = await storage.getUser(userId);
      
      await sendReportEmail({
        caseNumber,
        reportType: report.reportType,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        details: report.details,
        reporterPhone: user?.phone || undefined,
        status: report.status,
      });

      res.status(201).json({
        success: true,
        message: "تم إرسال البلاغ بنجاح",
        caseNumber,
        reportId: report.id,
        status: report.status,
      });
    } catch (error) {
      console.error("[Reports] Error creating report:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "بيانات غير صحيحة", details: error.errors });
      }
      res.status(500).json({ error: "حدث خطأ أثناء إرسال البلاغ" });
    }
  });

  app.get("/api/reports/my", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }

      const reports = await storage.getReportsByUser(userId);
      res.json(reports);
    } catch (error) {
      console.error("[Reports] Error fetching reports:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });
}
