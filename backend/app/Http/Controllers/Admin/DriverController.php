<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DriverController extends Controller
{
    public function index(): JsonResponse
    {
        $drivers = Driver::with(['tier', 'user'])->orderBy('sort_order', 'asc')->get();
        return ApiResponse::data(['drivers' => $drivers]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'service_tier' => 'nullable|integer|exists:site_tiers,tier,kind,driver',
            'avatar_url' => 'nullable|string|max:255',
            'bio' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            // Driver login account credentials
            'create_user_account' => 'nullable|boolean',
            'username' => 'nullable|string|max:255',
            'password' => 'nullable|string|min:6',
        ]);

        return DB::transaction(function () use ($validated) {
            $userId = null;

            // If create user account requested
            if (!empty($validated['create_user_account']) && !empty($validated['username']) && !empty($validated['password'])) {
                $userEmail = !empty($validated['email']) ? $validated['email'] : ($validated['username'] . '@archer.internal');

                // Check if user already exists
                $user = User::where('email', $userEmail)->first();
                if (!$user) {
                    $user = User::create([
                        'name' => $validated['name'],
                        'email' => $userEmail,
                        'password' => Hash::make($validated['password']),
                        'status' => 'active',
                    ]);

                    // Assign Driver role if exists
                    $driverRole = Role::firstOrCreate(
                        ['key' => 'driver'],
                        ['name' => 'Driver / Chauffeur']
                    );
                    $user->roles()->syncWithoutDetaching([$driverRole->id]);
                } else {
                    $user->update([
                        'password' => Hash::make($validated['password']),
                    ]);
                }

                $userId = $user->id;
            }

            $driverData = [
                'user_id' => $userId,
                'name' => $validated['name'],
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'service_tier' => $validated['service_tier'] ?? null,
                'avatar_url' => $validated['avatar_url'] ?? null,
                'bio' => $validated['bio'] ?? null,
                'sort_order' => $validated['sort_order'] ?? 0,
                'is_active' => $validated['is_active'] ?? true,
            ];

            $driver = Driver::create($driverData);
            return ApiResponse::data(['driver' => $driver->load(['tier', 'user'])], 201);
        });
    }

    public function show(string $id): JsonResponse
    {
        $driver = Driver::with(['tier', 'user'])->findOrFail($id);
        return ApiResponse::data(['driver' => $driver]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $driver = Driver::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'service_tier' => 'nullable|integer|exists:site_tiers,tier,kind,driver',
            'avatar_url' => 'nullable|string|max:255',
            'bio' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'password' => 'nullable|string|min:6',
        ]);

        return DB::transaction(function () use ($driver, $validated) {
            if (!empty($validated['password'])) {
                if ($driver->user) {
                    $driver->user->update([
                        'password' => Hash::make($validated['password']),
                    ]);
                } else {
                    $userEmail = !empty($validated['email']) ? $validated['email'] : ($driver->email ?: 'driver_' . substr($driver->id, 0, 6) . '@archer.internal');
                    $user = User::create([
                        'name' => $validated['name'] ?? $driver->name,
                        'email' => $userEmail,
                        'password' => Hash::make($validated['password']),
                        'status' => 'active',
                    ]);
                    $driverRole = Role::firstOrCreate(
                        ['key' => 'driver'],
                        ['name' => 'Driver / Chauffeur']
                    );
                    $user->roles()->syncWithoutDetaching([$driverRole->id]);
                    $driver->user_id = $user->id;
                }
            }

            $driver->update([
                'name' => $validated['name'] ?? $driver->name,
                'email' => array_key_exists('email', $validated) ? $validated['email'] : $driver->email,
                'phone' => array_key_exists('phone', $validated) ? $validated['phone'] : $driver->phone,
                'service_tier' => array_key_exists('service_tier', $validated) ? $validated['service_tier'] : $driver->service_tier,
                'avatar_url' => array_key_exists('avatar_url', $validated) ? $validated['avatar_url'] : $driver->avatar_url,
                'bio' => array_key_exists('bio', $validated) ? $validated['bio'] : $driver->bio,
                'sort_order' => array_key_exists('sort_order', $validated) ? $validated['sort_order'] : $driver->sort_order,
                'is_active' => array_key_exists('is_active', $validated) ? $validated['is_active'] : $driver->is_active,
            ]);

            return ApiResponse::data(['driver' => $driver->load(['tier', 'user'])]);
        });
    }

    public function destroy(string $id): JsonResponse
    {
        $driver = Driver::findOrFail($id);
        $driver->delete();
        return ApiResponse::data(['message' => 'Driver deleted successfully']);
    }
}
