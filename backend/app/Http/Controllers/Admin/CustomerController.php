<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AssistantProfile;
use App\Models\AuditLog;
use App\Models\LoginCode;
use App\Models\RideRequest;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Read-only customer directory for dispatch/operations. Customers are User rows holding only the
 * `customer` role; staff accounts are never listed here. Opening a customer is audited because the
 * record holds personal data.
 */
class CustomerController extends Controller
{
    /** GET /admin/customers?search= */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['search' => ['nullable', 'string', 'max:100']]);

        $query = $this->customers()
            ->withCount('rideRequests')
            ->withMax('rideRequests', 'created_at');

        if (! empty($data['search'])) {
            // Escape LIKE wildcards so a search for "%" or "_" matches literally.
            $term = '%'.addcslashes(Str::lower(trim($data['search'])), '%_\\').'%';
            $query->where(fn ($q) => $q
                ->whereRaw('lower(name) like ?', [$term])
                ->orWhereRaw('lower(email) like ?', [$term])
                ->orWhereRaw('lower(phone) like ?', [$term]));
        }

        $customers = $query->orderByDesc('ride_requests_max_created_at')->orderByDesc('id')->limit(200)->get()
            ->map(fn (User $u) => $this->summary($u));

        return ApiResponse::data(['customers' => $customers]);
    }

    /** GET /admin/customers/{id} */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $this->customers()->withCount('rideRequests')->withMax('rideRequests', 'created_at')->findOrFail($id);

        $rides = RideRequest::with('assignedDriver:id,name')
            ->where('customer_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (RideRequest $r) => [
                'id' => $r->id, 'reference' => $r->reference, 'request_type' => $r->request_type, 'service_type' => $r->service_type,
                'status' => $r->status, 'ride_date' => $r->ride_date, 'ride_time' => $r->ride_time,
                'pickup_location' => $r->pickup_location, 'dropoff_location' => $r->dropoff_location,
                'vehicle' => $r->vehicle, 'driver_tier' => $r->driver_tier,
                'driver' => $r->assignedDriver?->name, 'created_at' => $r->created_at?->toIso8601String(),
            ]);

        // EA/PA profiles saved under the same email (an assistant can have submitted more than one).
        $profiles = AssistantProfile::where('email', $user->email)->orderByDesc('created_at')->get()
            ->map(fn (AssistantProfile $p) => [
                'id' => $p->id, 'reference' => $p->reference, 'company' => $p->company, 'mobile' => $p->mobile,
                'data' => $p->data, 'created_at' => $p->created_at?->toIso8601String(),
            ]);

        AuditLog::record('customer.viewed', $request->user()->getKey(), ['customer_id' => $user->id], $user);

        return ApiResponse::data(['customer' => $this->summary($user) + ['rides' => $rides, 'assistant_profiles' => $profiles]]);
    }

    /**
     * POST /admin/customers/{id}/reset-credentials
     * Removes the customer's password, signs out every session and voids pending sign-in codes, then emails
     * them. Staff never see or set a customer's password; the customer signs in with an emailed code and
     * chooses a new password themselves.
     */
    public function resetCredentials(Request $request, int $id): JsonResponse
    {
        $user = $this->customers()->findOrFail($id);

        $user->forceFill(['password' => Str::random(48), 'password_set_at' => null])->save();
        $user->apiTokens()->delete();
        LoginCode::where('email', Str::lower($user->email))->whereNull('consumed_at')->update(['consumed_at' => now()]);

        AuditLog::record('customer.credentials_reset', $request->user()->getKey(), ['customer_id' => $user->id], $user);

        Mail::raw(
            "Hello {$user->name},

Archer has reset your sign-in details at your request. Any previous password has been removed and you have been signed out of all devices.

To sign in, open the Archer customer portal, enter your email address and use the one-time code we email you. You can then set a new password from your account.

If you did not ask for this, please call Archer dispatch.",
            fn ($m) => $m->to($user->email)->subject('Your Archer sign-in has been reset')
        );

        return ApiResponse::data(['message' => 'Credentials reset. The customer was emailed and can sign in with an emailed code.', 'has_password' => false]);
    }

    /** Users whose only role is customer. */
    private function customers()
    {
        return User::query()
            ->whereHas('roles', fn ($q) => $q->where('key', 'customer'))
            ->whereDoesntHave('roles', fn ($q) => $q->where('key', '!=', 'customer'));
    }

    private function summary(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'status' => $u->status,
            'has_password' => $u->password_set_at !== null,
            'email_verified' => $u->email_verified_at !== null,
            'last_login_at' => $u->last_login_at?->toIso8601String(),
            'created_at' => $u->created_at?->toIso8601String(),
            'rides_count' => (int) ($u->ride_requests_count ?? 0),
            'last_ride_at' => $u->ride_requests_max_created_at ? \Illuminate\Support\Carbon::parse($u->ride_requests_max_created_at)->toIso8601String() : null,
        ];
    }
}
