# Edge as Chrome

A small Microsoft Edge extension that makes Edge identify itself as Google Chrome on the
sites you choose, so "unsupported browser" messages go away.
Every other site still sees normal Edge.

It changes all three places a site can check:

- the `User-Agent` request header (removes `Edg/…`)
- the `Sec-CH-UA` client-hint headers ("Microsoft Edge" becomes "Google Chrome")
- the JavaScript values `navigator.userAgent`, `navigator.appVersion` and `navigator.userAgentData`

## Install

1. Open `edge://extensions` in Edge.
2. Turn on **Developer mode** (bottom-left).
3. Click **Load unpacked** and select this folder.
4. Optional: click the puzzle-piece icon in the toolbar and pin **Edge as Chrome**.

No sites are turned on until you add them.

## Use

Click the toolbar icon:

- **Turn on for <site>** adds the current site and reloads the tab.
- **Turn off for this site** removes it.
- Type a domain in the box and click **Add** to add one manually.
- Click **✕** next to a site to remove it.

## Updating

After editing any file, go to `edge://extensions` and click the reload icon on the extension's card.

## Notes

- Edge may show a "Turn off extensions in developer mode" banner at startup. Choose **Keep**
  (or close the banner) to keep it running.
- If a site still complains, it may be checking something this extension doesn't change. Most
  "unsupported browser" checks only look at the values listed above.
