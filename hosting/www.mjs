// Keep saved journeys on one browser origin. This Worker serves no game assets.
export default {
  fetch(request) {
    const target = new URL(request.url);
    target.protocol = 'https:';
    target.hostname = 'mythseal.com';
    target.port = '';
    return new Response(null, {
      status: 308,
      headers: { Location: target.href, 'Cache-Control': 'public, max-age=3600' },
    });
  },
};
