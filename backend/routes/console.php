<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('site:placeholders', function (\App\Support\PlaceholderScanner $scanner) {
    $hits = $scanner->scan();
    if ($hits === []) {
        $this->info('No placeholders in public website content.');

        return 0;
    }
    $this->table(['Location', 'Placeholder'], array_map(fn ($h) => [$h['location'], $h['text']], $hits));
    $this->error(count($hits).' placeholder(s) must be replaced before launch.');

    return 1;
})->purpose('List editorial placeholders still visible in public website content (launch gate)');

Artisan::command('security:release-shifts', function () {
    $n = \Illuminate\Support\Facades\DB::table('security_shifts')
        ->where('status', 'not_released_yet')
        ->where('starts_at', '<=', now()->addDays(\App\Support\Security\ShiftEligibility::RELEASE_HORIZON_DAYS))
        ->whereIn('contract_id', \Illuminate\Support\Facades\DB::table('security_contracts')->where('status', 'active')->select('id'))
        ->update(['status' => 'open', 'updated_at' => now()]);
    $this->info("Released {$n} security shift(s).");

    return 0;
})->purpose('Open contract shifts that are now inside the release horizon');

\Illuminate\Support\Facades\Schedule::command('security:release-shifts')->dailyAt('02:00');
