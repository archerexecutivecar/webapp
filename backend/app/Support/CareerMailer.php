<?php

namespace App\Support;

use App\Models\CareerApplication;
use App\Models\CareerJob;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class CareerMailer
{
    /**
     * Send instant confirmation email to applicant upon submitting credentials.
     */
    public static function sendApplicationConfirmation(CareerApplication $application, CareerJob $job): void
    {
        if (empty($application->email)) {
            return;
        }

        try {
            $name = $application->full_name ?: 'Applicant';
            $code = $application->reference_code;
            $siteUrl = rtrim((string) config('services.app_urls.site', 'https://archerexecutivecar.com'), '/');
            $trackUrl = "{$siteUrl}/careers?track={$code}";

            $tierInfo = $application->selected_tier ? "\n  Selected Tier: {$application->selected_tier}" : '';

            $body = "Dear {$name},\n\n"
                . "Thank you for applying to Archer Executive Services.\n\n"
                . "We have received your application for:\n"
                . "  Position: {$job->title}\n"
                . "  Department: {$job->department}\n"
                . "  Location: {$job->location}{$tierInfo}\n"
                . "  Application Reference Code: {$code}\n\n"
                . "You can track your application status anytime at:\n"
                . "{$trackUrl}\n\n"
                . "Our talent operations team is currently reviewing your documentation, licenses, and background qualifications. If your profile matches our criteria, a recruiter will reach out regarding an interview and road evaluation.\n\n"
                . "For inquiries, contact us at dispatch@archerexecutivecar.com.\n\n"
                . "On time ~ In style ~ Every time.\n\n"
                . "Warm regards,\n"
                . "Archer Executive Talent Operations";

            Mail::raw($body, function ($m) use ($application, $job) {
                $m->to($application->email, $application->full_name)
                    ->subject("Application Received: {$job->title} [Ref: {$application->reference_code}]");
            });
        } catch (\Throwable $e) {
            Log::warning('Failed sending application confirmation email: ' . $e->getMessage(), [
                'application_id' => $application->id,
            ]);
        }
    }
}
