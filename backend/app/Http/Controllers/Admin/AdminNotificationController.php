<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminNotificationController extends Controller
{
    public function index(): JsonResponse
    {
        $notifications = AdminNotification::with('rideRequest')
            ->orderBy('created_at', 'desc')
            ->take(30)
            ->get();

        $unreadCount = AdminNotification::where('is_read', false)->count();

        return ApiResponse::data([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    public function markAsRead(string $id): JsonResponse
    {
        if ($id === 'all') {
            AdminNotification::where('is_read', false)->update(['is_read' => true]);
        } else {
            AdminNotification::where('id', $id)->update(['is_read' => true]);
        }

        return ApiResponse::data(['message' => 'Notification marked as read']);
    }
}
