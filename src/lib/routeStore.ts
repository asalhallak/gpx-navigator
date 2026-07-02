import type { ImportedRoute } from '../types/route'

const DB_NAME = 'gpx-driving-exam-prep'
const DB_VERSION = 1
const ROUTES_STORE = 'routes'

export function getStoredRoutes(): Promise<ImportedRoute[]> {
  return withRouteStore('readonly', (store) => requestToPromise(store.getAll()))
}

export function saveRoute(route: ImportedRoute): Promise<void> {
  return withRouteStore('readwrite', async (store) => {
    await requestToPromise(store.put(route))
  })
}

export function deleteRoute(routeId: string): Promise<void> {
  return withRouteStore('readwrite', async (store) => {
    await requestToPromise(store.delete(routeId))
  })
}

export function clearRoutes(): Promise<void> {
  return withRouteStore('readwrite', async (store) => {
    await requestToPromise(store.clear())
  })
}

async function withRouteStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => T | Promise<T>,
): Promise<T> {
  const db = await openDatabase()

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(ROUTES_STORE, mode)
    const store = transaction.objectStore(ROUTES_STORE)
    let result: T

    transaction.oncomplete = () => {
      db.close()
      resolve(result)
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'))
    }

    transaction.onabort = () => {
      db.close()
      reject(transaction.error ?? new Error('IndexedDB transaction aborted.'))
    }

    Promise.resolve(callback(store)).then(
      (value) => {
        result = value
      },
      (error) => {
        transaction.abort()
        reject(error)
      },
    )
  })
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(ROUTES_STORE)) {
        db.createObjectStore(ROUTES_STORE, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB.'))
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })
}
