/**
 * folderAccess.js
 * Lightweight IndexedDB helpers for persisting FileSystemDirectoryHandle objects.
 * Uses a single store named "handles" in a database named "choreographer_fs".
 */

const DB_NAME = 'choreographer_fs'
const DB_VERSION = 1
const STORE_NAME = 'handles'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Save a FileSystemDirectoryHandle under `key`.
 * @param {string} key
 * @param {FileSystemDirectoryHandle} handle
 */
export async function saveHandle(key, handle) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Load a previously saved FileSystemDirectoryHandle.
 * Returns null if not found.
 * @param {string} key
 * @returns {Promise<FileSystemDirectoryHandle|null>}
 */
export async function loadHandle(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Remove a stored handle.
 * @param {string} key
 */
export async function removeHandle(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
