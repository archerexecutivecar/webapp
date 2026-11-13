<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\RateCard;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Rates are financial data: gated by pricing.manage and every change records old and new values. */
class RateCardController extends Controller
{
    public function index(): JsonResponse
    {
        return ApiResponse::data(['rates' => RateCard::orderBy('kind')->orderBy('vehicle_class')->orderBy('size')->orderBy('tier')->get()]);
    }

    /** PUT /admin/rates — body: { rates: [{id, amount_cents, is_active?}] } */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'rates' => 'required|array|min:1|max:200',
            'rates.*.id' => 'required|uuid|exists:rate_cards,id',
            'rates.*.amount_cents' => 'required|integer|min:0|max:100000000',
            'rates.*.is_active' => 'nullable|boolean',
        ]);

        DB::transaction(function () use ($data, $request): void {
            foreach ($data['rates'] as $row) {
                $card = RateCard::lockForUpdate()->findOrFail($row['id']);
                $before = ['amount_cents' => $card->amount_cents, 'is_active' => $card->is_active];
                $card->fill(['amount_cents' => $row['amount_cents'], 'is_active' => $row['is_active'] ?? $card->is_active])->save();
                if ($card->wasChanged()) {
                    AuditLog::record('site.rate.updated', $request->user()->getKey(), [
                        'kind' => $card->kind, 'vehicle_class' => $card->vehicle_class, 'size' => $card->size, 'tier' => $card->tier,
                        'before' => $before, 'after' => ['amount_cents' => $card->amount_cents, 'is_active' => $card->is_active],
                    ], $card);
                }
            }
        });

        return $this->index();
    }
}
