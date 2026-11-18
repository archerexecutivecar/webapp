<?php

return [
    /*
    | Allow staff without a linked driver row to preview the first driver's portal.
    | Always false in production regardless of this flag.
    */
    'allow_driver_preview' => (bool) env('ARCHER_ALLOW_DRIVER_PREVIEW', false),
];
