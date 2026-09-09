import { notifyUser } from "./notificationService.js";
import { notifyAdmins } from "./adminAlertService.js";
import {
  sendJobApplicationSubmittedApplicantEmail,
  sendJobApplicationSubmittedCreatorEmail,
  sendJobApplicationSubmittedAdminEmail,
  sendJobApplicationStatusUpdatedEmail,
} from "./emailService.js";

// Mirrors donationNotificationService.js's single-call-site, Promise.all
// fan-out shape — one place all three "application submitted" recipients
// (applicant, job creator, admin) are notified from, called right after the
// JobApplication row is committed. Never throws — a notification failure
// must not unwind an application that already succeeded.
export async function sendJobApplicationSubmittedNotifications(application, job, applicant, poster) {
  try {
    notifyUser({
      userId: applicant.id,
      type: "job_application_submitted",
      title: "Application submitted",
      body: `Your application for "${job.title}" has been submitted.`,
      link: `/job/${job.slug}`,
      relatedJobId: job.id,
    }).catch(() => {});

    if (poster && poster.id !== applicant.id) {
      notifyUser({
        userId: poster.id,
        type: "job_application_submitted",
        title: "New applicant",
        body: `${applicant.fullName} applied to "${job.title}".`,
        link: `/account/my-jobs/${job.id}/applications`,
        relatedJobId: job.id,
      }).catch(() => {});
    }

    notifyAdmins({
      type: "job_application_submitted",
      title: "New job application",
      body: `${applicant.fullName} applied to "${job.title}".`,
      link: `/admin/jobs/${job.id}`,
      relatedJobId: job.id,
    }).catch(() => {});

    await Promise.all([
      sendJobApplicationSubmittedApplicantEmail(application, job, applicant, poster),
      sendJobApplicationSubmittedCreatorEmail(application, job, applicant, poster),
      sendJobApplicationSubmittedAdminEmail(application, job, applicant, poster),
    ]);
  } catch {
    // Best-effort — see donationNotificationService.js's identical rationale.
  }
}

export async function sendJobApplicationStatusUpdatedNotifications(application, job, applicant, poster, newStatusLabel) {
  try {
    notifyUser({
      userId: applicant.id,
      type: "job_application_status_updated",
      title: "Application status updated",
      body: `Your application for "${job.title}" is now ${newStatusLabel}.`,
      link: `/job/${job.slug}`,
      relatedJobId: job.id,
    }).catch(() => {});

    await sendJobApplicationStatusUpdatedEmail(application, job, applicant, poster, newStatusLabel);
  } catch {
    // Best-effort.
  }
}
