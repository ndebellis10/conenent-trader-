/**
 * Simple module-level state tracking whether admin is viewing a specific user.
 * Used by Dashboard to decide whether to show AdminHome or the user's data.
 */
let _viewingUser = null  // { id, email, name } or null

export function setAdminViewingUser(user) { _viewingUser = user || null }
export function getAdminViewingUser()     { return _viewingUser }
export function isAdminViewingUser()      { return _viewingUser !== null }
