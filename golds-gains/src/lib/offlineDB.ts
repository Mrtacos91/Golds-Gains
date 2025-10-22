// IndexedDB para almacenar workouts offline
const DB_NAME = "GoldsGainsDB";
const DB_VERSION = 1;
const STORE_NAME = "pendingWorkouts";

export interface PendingWorkout {
  id?: number;
  timestamp: number;
  workoutData: any;
  synced: boolean;
}

// Abrir o crear la base de datos
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("[IndexedDB] Error al abrir la base de datos");
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log("[IndexedDB] Base de datos abierta exitosamente");
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      console.log("[IndexedDB] Actualizando esquema de base de datos");
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        objectStore.createIndex("timestamp", "timestamp", { unique: false });
        objectStore.createIndex("synced", "synced", { unique: false });
        console.log("[IndexedDB] Object Store creado:", STORE_NAME);
      }
    };
  });
};

// Guardar workout pendiente en IndexedDB
export const saveOfflineWorkout = async (workoutData: any): Promise<number> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const pendingWorkout: PendingWorkout = {
      timestamp: Date.now(),
      workoutData,
      synced: false,
    };

    const request = store.add(pendingWorkout);

    request.onsuccess = () => {
      console.log("[IndexedDB] Workout guardado offline, ID:", request.result);
      resolve(request.result as number);
    };

    request.onerror = () => {
      console.error("[IndexedDB] Error al guardar workout offline");
      reject(request.error);
    };
  });
};

// Obtener todos los workouts pendientes de sincronizar
export const getPendingWorkouts = async (): Promise<PendingWorkout[]> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("synced");

    const request = index.getAll(IDBKeyRange.only(false));

    request.onsuccess = () => {
      console.log(
        "[IndexedDB] Workouts pendientes encontrados:",
        request.result.length
      );
      resolve(request.result);
    };

    request.onerror = () => {
      console.error("[IndexedDB] Error al obtener workouts pendientes");
      reject(request.error);
    };
  });
};

// Marcar workout como sincronizado
export const markAsSynced = async (id: number): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(id);

    request.onsuccess = () => {
      const workout = request.result;
      if (workout) {
        workout.synced = true;

        const updateRequest = store.put(workout);

        updateRequest.onsuccess = () => {
          console.log("[IndexedDB] Workout marcado como sincronizado, ID:", id);
          resolve();
        };

        updateRequest.onerror = () => {
          console.error("[IndexedDB] Error al actualizar workout");
          reject(updateRequest.error);
        };
      } else {
        reject(new Error("Workout no encontrado"));
      }
    };

    request.onerror = () => {
      console.error("[IndexedDB] Error al obtener workout");
      reject(request.error);
    };
  });
};

// Eliminar workout sincronizado
export const deleteSyncedWorkout = async (id: number): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(id);

    request.onsuccess = () => {
      console.log("[IndexedDB] Workout eliminado, ID:", id);
      resolve();
    };

    request.onerror = () => {
      console.error("[IndexedDB] Error al eliminar workout");
      reject(request.error);
    };
  });
};

// Limpiar todos los workouts sincronizados
export const cleanSyncedWorkouts = async (): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("synced");

    const request = index.openCursor(IDBKeyRange.only(true));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        console.log("[IndexedDB] Workouts sincronizados eliminados");
        resolve();
      }
    };

    request.onerror = () => {
      console.error("[IndexedDB] Error al limpiar workouts sincronizados");
      reject(request.error);
    };
  });
};

// Obtener cantidad de workouts pendientes
export const getPendingCount = async (): Promise<number> => {
  const workouts = await getPendingWorkouts();
  return workouts.length;
};
