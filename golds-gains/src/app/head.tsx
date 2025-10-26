export default function Head() {
  return (
    <>
      <title>Gold's Gains</title>
      <meta name="description" content="Routines & Training - Gold's Gains" />
      {/* Favicon */}
      <link rel="icon" href="/logo.png" />
      <link rel="shortcut icon" href="/logo.png" />

      {/* Web App Manifest */}
      <link rel="manifest" href="/manifest.json" />

      {/* Theme and mobile behavior */}
      <meta name="theme-color" content="#fb923c" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
      />
      <meta name="apple-mobile-web-app-title" content="Gold's Gains" />

      {/* Apple touch icon (used for iOS home screen) */}
      <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />

      {/* Microsoft tile for Windows */}
      <meta name="msapplication-TileColor" content="#0a0a0a" />
      <meta name="msapplication-TileImage" content="/logo.png" />
    </>
  );
}
