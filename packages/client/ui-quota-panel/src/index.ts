/**
 * Quota panel browser half, node-side stub: the empty apply exists so the
 * package appears as a host Loader row; the browser half ships via
 * exports["./client"], discovered through the package.json `dsh.client`
 * declaration.
 */

/** Host plugin body — no host-side behavior for this UI plugin. */
export function apply(): void {}
