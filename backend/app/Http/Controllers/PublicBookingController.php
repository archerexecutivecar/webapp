<?php

namespace App\Http\Controllers;

use App\Models\AdminNotification;
use App\Models\AssistantProfile;
use App\Models\AuditLog;
use App\Models\RideRequest;
use App\Models\SiteTier;
use App\Models\SiteVehicle;
use App\Support\ApiResponse;
use App\Support\AssistantProfileRules;
use App\Support\CustomerAccounts;
use App\Support\CustomerMailer;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Public booking-request intake for the website forms.
 *
 * Authority notes (docs/PRICING_RULES.md): this endpoint NEVER accepts or stores a price, fare or total
 * from the client. Requests are stored as `pending` for dispatch, which confirms the price. Any estimate
 * shown in the browser is display-only. Every field is validated here; the browser is not trusted.
 */
class PublicBookingController extends Controller
{
    private const TYPES = [
        'general' => ['prefix' => 'ARC', 'label' => 'General booking'],
        'point_to_point' => ['prefix' => 'P2P', 'label' => 'Point to Point'],
        'airport' => ['prefix' => 'AIR', 'label' => 'Airport Transportation'],
        'client_car' => ['prefix' => 'CCS', 'label' => 'Client Car Service'],
        'concierge' => ['prefix' => 'CON', 'label' => 'Concierge Services'],
        'assistant_week' => ['prefix' => 'WEEK', 'label' => 'EA/PA weekly plan'],
    ];

    private const AIRPORTS = ['EWR', 'JFK', 'LGA', 'PHL', 'ACY', 'TEB', 'MMU', 'OTHER'];

    /** POST /v1/booking-requests */
    public function store(Request $request): JsonResponse
    {
        $type = $request->input('request_type');
        if (! is_string($type) || ! array_key_exists($type, self::TYPES)) {
            return ApiResponse::error('VALIDATION_FAILED', 'The given data was invalid.', 422, [
                'request_type' => ['Choose a valid request type.'],
            ]);
        }

        $key = $this->idempotencyKey($request);
        if ($key && ($existing = RideRequest::where('idempotency_key', $key)->first())) {
            return $this->accepted($existing->reference, $existing->status, 200);
        }

        $data = $request->validate($this->rules($type));
        $this->assertVehicleInCatalog($data);

        $columns = $this->columns($type, $data);
        $details = Arr::except($data, ['request_type', 'first_name', 'last_name', 'email', 'phone', 'terms_accepted']);

        try {
            $ride = RideRequest::create($columns + [
                'reference' => $this->reference(self::TYPES[$type]['prefix'], fn (string $r) => RideRequest::where('reference', $r)->exists()),
                'request_type' => $type,
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'] ?? null,
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'],
                'status' => 'pending',
                'details' => $details ?: null,
                'idempotency_key' => $key,
                // Linked by email: the customer signs in later (emailed code or password) to see this ride.
                'customer_id' => CustomerAccounts::forBooking($data['email'] ?? null, trim($data['first_name'].' '.($data['last_name'] ?? '')), $data['phone'])?->getKey(),
            ]);
        } catch (QueryException $e) {
            // Two simultaneous submits with the same key: return the one that won.
            if ($key && ($existing = RideRequest::where('idempotency_key', $key)->first())) {
                return $this->accepted($existing->reference, $existing->status, 200);
            }
            throw $e;
        }

        AuditLog::record('booking_request.created', null, ['reference' => $ride->reference, 'type' => $type], $ride);

        CustomerMailer::sendBookingConfirmation($ride);

        AdminNotification::create([
            'ride_request_id' => $ride->id,
            'title' => 'New '.self::TYPES[$type]['label'].' request ('.$ride->reference.')',
            'message' => trim($ride->first_name.' '.$ride->last_name).' submitted a '.self::TYPES[$type]['label'].' request'
                .($ride->ride_date ? ' for '.$ride->ride_date.($ride->ride_time ? ' at '.$ride->ride_time : '') : '').'.',
            'type' => 'ride_request',
            'is_read' => false,
        ]);

        return $this->accepted($ride->reference, $ride->status, 201);
    }

    /** POST /v1/assistant-profiles */
    public function storeAssistantProfile(Request $request): JsonResponse
    {
        $key = $this->idempotencyKey($request);
        if ($key && ($existing = AssistantProfile::where('idempotency_key', $key)->first())) {
            return $this->accepted($existing->reference, $existing->status, 200);
        }

        $short = ['nullable', 'string', 'max:150'];
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150'],
            'mobile' => ['required', 'string', 'max:50'],
            'company' => $short,
            'terms_accepted' => ['accepted'],
        ] + AssistantProfileRules::sections());

        // The assistant gets a customer account too, so they can sign in and see their rides.
        CustomerAccounts::forBooking($data['email'], trim($data['first_name'].' '.$data['last_name']), $data['mobile']);

        try {
            $profile = AssistantProfile::create([
                'reference' => $this->reference('AST', fn (string $r) => AssistantProfile::where('reference', $r)->exists()),
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'mobile' => $data['mobile'],
                'company' => $data['company'] ?? null,
                'data' => Arr::only($data, ['about', 'company_info', 'people', 'billing']),
                'terms_accepted_at' => now(),
                'idempotency_key' => $key,
                'status' => 'active',
            ]);
        } catch (QueryException $e) {
            if ($key && ($existing = AssistantProfile::where('idempotency_key', $key)->first())) {
                return $this->accepted($existing->reference, $existing->status, 200);
            }
            throw $e;
        }

        // Audit trail without personal details.
        AuditLog::record('assistant_profile.created', null, ['reference' => $profile->reference], $profile);

        return $this->accepted($profile->reference, $profile->status, 201);
    }

    // ---------------------------------------------------------------------------------------------

    private function accepted(string $reference, string $status, int $http): JsonResponse
    {
        return ApiResponse::data([
            'reference' => $reference,
            'status' => $status,
            'message' => 'Request received. Dispatch will confirm the details and final price.',
        ], $http);
    }

    private function idempotencyKey(Request $request): ?string
    {
        $key = $request->header('Idempotency-Key');

        return is_string($key) && $key !== '' && strlen($key) <= 100 && preg_match('/^[A-Za-z0-9._-]+$/', $key) ? $key : null;
    }

    /** The requested class + size must be an active Website Fleet entry. */
    private function assertVehicleInCatalog(array $data): void
    {
        $pairs = [];
        if (! empty($data['vehicle_class']) && ! empty($data['vehicle_size'])) {
            $pairs['vehicle_size'] = [$data['vehicle_class'], $data['vehicle_size']];
        }
        if (isset($data['vehicle']) && preg_match('/^(exec|first)\|(sedan|suv|van)$/', $data['vehicle'], $m)) {
            $pairs['vehicle'] = [$m[1], $m[2]];
        }

        foreach ($pairs as $field => [$class, $size]) {
            $offered = SiteVehicle::where('vehicle_class', $class)->where('size', $size)->where('is_active', true)->exists();
            if (! $offered) {
                throw ValidationException::withMessages([$field => ['This vehicle is not currently offered.']]);
            }
        }
    }

    private function reference(string $prefix, callable $exists): string
    {
        $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no look-alike characters
        do {
            $suffix = '';
            for ($i = 0; $i < 6; $i++) {
                $suffix .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $reference = $prefix.'-'.$suffix;
        } while ($exists($reference));

        return $reference;
    }

    /** Maps validated form data onto the legacy ride_requests columns dispatch already reads. */
    private function columns(string $type, array $d): array
    {
        $vehicle = fn (?string $c, ?string $s) => $c && $s ? "$c|$s" : null;

        return match ($type) {
            'general' => [
                'service_type' => $d['service'],
                'driver_tier' => (string) $d['tier'],
                'ride_date' => $d['date'], 'ride_time' => $d['time'],
                'pickup_location' => $d['pickup_address'], 'dropoff_location' => $d['dropoff_address'] ?? null,
                'vehicle' => $vehicle($d['vehicle_class'] ?? null, $d['vehicle_size'] ?? null) ?? ($d['client_vehicle'] ?? null),
                'security_addon' => (string) ($d['guards'] ?? 0),
            ],
            'point_to_point' => [
                'service_type' => 'p2p', 'driver_tier' => (string) $d['tier'],
                'ride_date' => $d['date'], 'ride_time' => $d['time'],
                'pickup_location' => $d['pickup_address'], 'dropoff_location' => $d['dropoff_address'],
                'vehicle' => $vehicle($d['vehicle_class'], $d['vehicle_size']),
            ],
            'airport' => [
                'service_type' => 'airport', 'driver_tier' => (string) $d['tier'],
                'ride_date' => $d['date'], 'ride_time' => $d['time'],
                'pickup_location' => $d['direction'] === 'from' ? $d['airport'] : $d['address'],
                'dropoff_location' => $d['direction'] === 'from' ? $d['address'] : $d['airport'],
                'vehicle' => $vehicle($d['vehicle_class'], $d['vehicle_size']),
            ],
            'client_car' => [
                'service_type' => 'client-car', 'driver_tier' => (string) $d['tier'],
                'ride_date' => $d['date'], 'ride_time' => $d['time'],
                'pickup_location' => $d['pickup_address'], 'dropoff_location' => $d['destination'],
                'vehicle' => trim(($d['vehicle_make'] ?? '').' '.($d['vehicle_model'] ?? '').' '.($d['vehicle_year'] ?? '')) ?: null,
            ],
            'concierge' => [
                'service_type' => 'concierge', 'driver_tier' => '1',
                'ride_date' => $d['date'] ?? null,
                'pickup_location' => $d['area'] ?? null,
            ],
            'assistant_week' => [
                'service_type' => 'assistant-week', 'driver_tier' => (string) $d['tier'],
                'ride_date' => $d['rides'][0]['date'], 'ride_time' => $d['rides'][0]['time'] ?? null,
                'pickup_location' => $d['rides'][0]['from'] ?? null, 'dropoff_location' => $d['rides'][0]['to'] ?? null,
                'vehicle' => $d['vehicle'],
            ],
        };
    }

    private function rules(string $type): array
    {
        $short = ['nullable', 'string', 'max:150'];
        $date = ['required', 'date_format:Y-m-d', 'after_or_equal:today'];
        $time = ['required', 'date_format:H:i'];
        // The Admin website catalog (Website Tiers / Website Fleet) is the source of truth for what can be booked.
        $tier = ['required', 'integer', Rule::in(SiteTier::where('kind', 'driver')->where('is_active', true)->pluck('tier')->all())];
        $cls = ['required', Rule::in(['exec', 'first'])];
        $size = ['required', Rule::in(['sedan', 'suv', 'van'])];
        $stops = ['nullable', 'array', 'max:5'];

        $contact = [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150'],
            'phone' => ['required', 'string', 'max:50'],
            'terms_accepted' => ['accepted'],
            'special_requests' => ['nullable', 'string', 'max:1000'],
        ];

        $rules = match ($type) {
            'general' => [
                'service' => ['required', Rule::in(['hourly', 'airport', 'p2p', 'client', 'security'])],
                'pickup_address' => ['required', 'string', 'max:255'],
                'dropoff_address' => ['nullable', 'string', 'max:255'],
                'date' => $date, 'time' => $time,
                'passengers' => ['required', 'integer', 'between:1,60'], 'bags' => ['nullable', 'integer', 'between:0,60'],
                'stops' => $stops, 'stops.*' => ['nullable', 'string', 'max:255'],
                'hours' => ['nullable', 'integer', 'between:3,24'],
                'airline_flight' => $short, 'terminal' => $short,
                'tier' => $tier,
                'vehicle_class' => ['nullable', 'required_if:service,hourly,airport,p2p', Rule::in(['exec', 'first'])],
                'vehicle_size' => ['nullable', 'required_if:service,hourly,airport,p2p', Rule::in(['sedan', 'suv', 'van'])],
                'client_vehicle' => ['nullable', 'required_if:service,client', 'string', 'max:150'],
                'guards' => ['nullable', 'integer', 'between:0,10'],
            ],
            'point_to_point' => [
                'way' => ['required', Rule::in(['one', 'round'])],
                'pickup_address' => ['required', 'string', 'max:255'], 'dropoff_address' => ['required', 'string', 'max:255'],
                'stops' => $stops, 'stops.*' => ['nullable', 'string', 'max:255'],
                'date' => $date, 'time' => $time, 'return_time' => ['nullable', 'required_if:way,round', 'date_format:H:i'],
                'passengers' => ['required', 'integer', 'between:1,60'], 'bags' => ['nullable', 'integer', 'between:0,60'],
                'tier' => $tier, 'vehicle_class' => $cls, 'vehicle_size' => $size,
            ],
            'airport' => [
                'direction' => ['required', Rule::in(['from', 'to'])],
                'airport' => ['required', Rule::in(self::AIRPORTS)],
                'airline' => $short, 'flight_number' => ['required', 'string', 'max:20'], 'terminal' => $short,
                'date' => $date, 'time' => $time, 'address' => ['required', 'string', 'max:255'],
                'passengers' => ['required', 'integer', 'between:1,60'],
                'checked_bags' => ['nullable', 'integer', 'between:0,60'], 'carry_ons' => ['nullable', 'integer', 'between:0,60'],
                'meet' => ['required', Rule::in(['curb', 'sign'])],
                'tier' => $tier, 'vehicle_class' => $cls, 'vehicle_size' => $size,
                'return_trip' => ['nullable', 'boolean'], 'sign_name' => $short,
            ],
            'client_car' => [
                'pickup_address' => ['required', 'string', 'max:255'], 'destination' => ['required', 'string', 'max:255'],
                'date' => $date, 'time' => $time,
                'hours' => ['required', 'integer', 'between:3,24'],
                'frequency' => $short,
                'vehicle_make' => ['required', 'string', 'max:60'], 'vehicle_model' => ['required', 'string', 'max:60'],
                'vehicle_year' => ['nullable', 'digits:4'], 'vehicle_color' => ['nullable', 'string', 'max:40'],
                'key_handover' => $short, 'tier' => $tier,
                'vehicle_confirmed' => ['accepted'],
            ],
            'concierge' => [
                'occasion' => ['required', Rule::in(['dinner', 'celebration', 'proposal', 'corporate', 'itinerary', 'other'])],
                'date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:today'],
                'guests' => ['nullable', 'integer', 'between:1,500'], 'area' => $short, 'transport' => $short,
                'itinerary' => ['required', 'string', 'max:4000'],
            ],
            'assistant_week' => [
                'executive_name' => ['required', 'string', 'max:150'], 'executive_mobile' => ['nullable', 'string', 'max:50'],
                'vehicle' => ['required', 'regex:/^(exec|first)\|(sedan|suv|van)$/'],
                'passengers' => ['required', 'integer', 'between:1,60'],
                'tier' => $tier, 'preferences' => ['nullable', 'string', 'max:2000'],
                'rides' => ['required', 'array', 'min:1', 'max:12'],
                'rides.*.type' => ['required', Rule::in(['airport_in', 'airport_out', 'p2p', 'hourly'])],
                'rides.*.date' => $date, 'rides.*.time' => ['nullable', 'date_format:H:i'],
                'rides.*.from' => ['nullable', 'string', 'max:255'], 'rides.*.to' => ['nullable', 'string', 'max:255'],
                'rides.*.hours' => ['nullable', 'integer', 'between:4,24'],
                'repeat' => $short,
                'notify' => ['required', Rule::in(['me', 'exec', 'both'])],
                'billing' => ['required', Rule::in(['card', 'invoice'])],
                'company' => $short,
            ],
        };

        if ($type === 'concierge') {
            // Concierge keeps the design's lighter contact form: phone required, email optional.
            $contact['email'] = ['nullable', 'email', 'max:150'];
        }

        return $contact + $rules;
    }
}
