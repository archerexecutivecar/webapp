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
