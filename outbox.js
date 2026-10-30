/* Persistent, ordered, per-route outbox. Never discard an unacknowledged event. */
class DeliveryOutbox {
  constructor(storage, routeId, send) {
    this.storage = storage; this.routeId = routeId; this.send = send;
    this.key = 'plaswill_outbox_v1_' + routeId;
    this.reload();
    this.running = false; this.retryAt = 0; this.attempts = 0;
  }
  reload() {
    const raw = this.storage.getItem(this.key);
    const items = JSON.parse(raw === null ? '[]' : raw);
    const operations = new Set();
    if (!Array.isArray(items)) throw new Error('Fila local inválida. Preserve os dados para revisão da expedição.');
    for (const e of items) {
      if (!e || e.route_id !== this.routeId ||
      typeof e.operation_id !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(e.operation_id) ||
      operations.has(e.operation_id) ||
      typeof e.stop_id !== 'string' || !['pending','delivered'].includes(e.status) ||
      !['pending','delivered'].includes(e.previous_status) || !['pending','conflict','unauthorized'].includes(e.state) ||
      !Number.isInteger(e.expected_version) || e.expected_version < 0) throw new Error('Fila local inválida. Preserve os dados para revisão da expedição.');
      operations.add(e.operation_id);
    }
    this.items = items;
  }
  persist() { this.storage.setItem(this.key, JSON.stringify(this.items)); }
  enqueue(stop, status) {
    const preceding = this.items.filter(e => e.stop_id === stop.id);
    const event = { operation_id: crypto.randomUUID(), route_id: this.routeId, stop_id: stop.id,
      status, timestamp: new Date().toISOString(), state: 'pending',
      expected_version: (stop.version || 0) + preceding.filter(e => e.status !== e.previous_status).length,
      previous_status: stop.status };
    this.items.push(event);
    try { this.persist(); } catch (err) { this.items.pop(); throw err; }
    return event;
  }
  overlay(route) {
    for (const e of this.items) {
      const stop = route.stops.find(s => s.id === e.stop_id);
      if (stop) stop.status = e.status;
    }
  }
  async flush(force = false) {
    if (this.running || (!force && Date.now() < this.retryAt)) return;
    this.running = true;
    try {
      while (this.items.length) {
        const e = this.items[0];
        if (['conflict', 'unauthorized'].includes(e.state)) break;
        const response = await this.send(e);
        const data = await response.json();
        if (!response.ok) {
          e.state = response.status === 409 ? 'conflict' : [401, 403].includes(response.status) ? 'unauthorized' : 'pending';
          this.persist(); throw new Error('sync');
        }
        const expected = e.expected_version + (e.status !== e.previous_status ? 1 : 0);
        if (!data.success || data.operation_id !== e.operation_id || data.route_id !== this.routeId || data.stop_id !== e.stop_id || data.status !== e.status || !Number.isInteger(data.version) || data.version !== expected) throw new Error('ack');
        this.items.shift();
        try { this.persist(); } catch (err) { this.items.unshift(e); throw err; }
        this.attempts = 0; this.retryAt = 0;
      }
    } catch (_) {
      this.retryAt = Date.now() + Math.min(60000, 1000 * 2 ** Math.min(++this.attempts, 6));
    } finally { this.running = false; }
  }
}
if (typeof module !== 'undefined') module.exports = DeliveryOutbox;
