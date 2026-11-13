<?php

namespace App\Support;

use App\Models\RideRequest;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class CustomerMailer
{
    private static function portalUrl(string $path = ''): string
    {
        $base = rtrim((string) env('CLIENT_URL', 'https://client.archerexecutivecar.com'), '/');

        return $path !== '' ? "{$base}/" . ltrim($path, '/') : $base;
    }

    /**
     * Send welcome email when a new customer account is created.
     */
    public static function sendWelcome(User $user): void
    {
        if (empty($user->email)) {
            return;
        }

        try {
            $name = $user->name ?: 'Valued Customer';
            $loginUrl = self::portalUrl('login');

            $body = "Hello {$name},\n\n"
                . "Welcome to Archer Executive Transportation. Your customer account is now active.\n\n"
                . "With your Archer account, you can access our private client portal anytime to:\n"
                . "  • View upcoming reservations and itinerary details\n"
                . "  • Track your assigned chauffeur and vehicle live\n"
                . "  • Access past ride history and receipts\n\n"
                . "Sign in to your portal here:\n"
                . "{$loginUrl}\n\n"
                . "Our dispatch team is available 24/7 if you need any assistance: (848) 231-9997 or dispatch@archerexecutivecar.com.\n\n"
                . "Thank you for choosing Archer Executive Transportation.\n\n"
                . "Warm regards,\n"
                . "The Archer Executive Team";

            Mail::raw($body, function ($m) use ($user) {
                $m->to($user->email, $user->name)->subject('Welcome to Archer Executive Transportation');
            });
        } catch (\Throwable $e) {
            Log::warning('Failed sending welcome email to customer: ' . $e->getMessage(), ['user_id' => $user->id]);
        }
    }

    /**
     * Send ride booking confirmation email.
     */
    public static function sendBookingConfirmation(RideRequest $ride): void
    {
        if (empty($ride->email)) {
            return;
        }

        try {
            $name = trim($ride->first_name . ' ' . ($ride->last_name ?? '')) ?: 'Valued Customer';
            $portalUrl = self::portalUrl('rides/' . $ride->id);

            $date = $ride->ride_date ?: 'Pending confirmation';
            $time = $ride->ride_time ? " at {$ride->ride_time}" : '';
            $pickup = $ride->pickup_location ?: 'As requested';
            $dropoff = $ride->dropoff_location ?: 'As requested';
            $service = $ride->service_type ? ucfirst(str_replace('_', ' ', $ride->service_type)) : 'Executive Chauffeur';
            $vehicle = $ride->vehicle ?: 'Executive Fleet';

            $body = "Hello {$name},\n\n"
                . "Thank you for booking with Archer Executive Transportation. Your reservation has been registered with dispatch.\n\n"
                . "Reservation Details:\n"
                . "  • Confirmation Reference: {$ride->reference}\n"
                . "  • Service: {$service}\n"
                . "  • Date & Time: {$date}{$time}\n"
                . "  • Pickup Location: {$pickup}\n"
                . "  • Destination: {$dropoff}\n"
                . "  • Vehicle: {$vehicle}\n\n"
                . "Manage & Track Your Ride:\n"
                . "You can view your itinerary, chauffeur assignment, and live status at:\n"
                . "{$portalUrl}\n\n"
                . "Need to adjust your reservation? Our dispatch desk is at your service 24/7 at (848) 231-9997 or dispatch@archerexecutivecar.com.\n\n"
                . "Best regards,\n"
                . "Archer Executive Transportation Dispatch";

            Mail::raw($body, function ($m) use ($ride, $name) {
                $m->to($ride->email, $name)->subject("Booking Confirmed: {$ride->reference} - Archer Executive Transportation");
            });
        } catch (\Throwable $e) {
            Log::warning('Failed sending booking confirmation email: ' . $e->getMessage(), ['ride_id' => $ride->id]);
        }
    }

    /**
     * Send notification when a ride's status changes.
     */
    public static function sendRideStatusChanged(RideRequest $ride, string $oldStatus, string $newStatus): void
    {
        if (empty($ride->email) || $oldStatus === $newStatus) {
            return;
        }

        try {
            $ride->loadMissing('assignedDriver');
            $name = trim($ride->first_name . ' ' . ($ride->last_name ?? '')) ?: 'Valued Customer';
            $statusLabels = [
                'pending' => 'Pending Dispatch',
                'dispatched' => 'Chauffeur Dispatched',
                'in_progress' => 'Ride in Progress',
                'completed' => 'Ride Completed',
                'cancelled' => 'Reservation Cancelled',
            ];
            $label = $statusLabels[$newStatus] ?? ucfirst(str_replace('_', ' ', $newStatus));
            $portalUrl = self::portalUrl('rides/' . $ride->id);

            $driverInfo = '';
            if ($ride->assignedDriver && in_array($newStatus, ['dispatched', 'in_progress'], true)) {
                $driverName = $ride->assignedDriver->name;
                $driverInfo = "\nAssigned Chauffeur:\n  • Name: {$driverName}\n";
            }

            $date = $ride->ride_date ?: 'Scheduled date';
            $time = $ride->ride_time ? " at {$ride->ride_time}" : '';
            $pickup = $ride->pickup_location ?: 'As requested';
            $dropoff = $ride->dropoff_location ?: 'As requested';

            $body = "Hello {$name},\n\n"
                . "Your Archer Executive reservation ({$ride->reference}) has an update.\n\n"
                . "Current Status: {$label}\n"
                . "Date & Time: {$date}{$time}\n"
                . "Pickup: {$pickup}\n"
                . "Destination: {$dropoff}\n"
                . $driverInfo . "\n"
                . "View live tracking and updates in your Archer portal:\n"
                . "{$portalUrl}\n\n"
                . "If you need immediate assistance, call dispatch at (848) 231-9997.\n\n"
                . "Best regards,\n"
                . "Archer Executive Transportation";

            Mail::raw($body, function ($m) use ($ride, $name, $label) {
                $m->to($ride->email, $name)->subject("Ride Update ({$ride->reference}): {$label} - Archer Executive");
            });
        } catch (\Throwable $e) {
            Log::warning('Failed sending status change email: ' . $e->getMessage(), ['ride_id' => $ride->id, 'new_status' => $newStatus]);
        }
    }
}
