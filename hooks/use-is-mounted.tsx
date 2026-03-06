import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function useIsMounted() {
    return useSyncExternalStore(
        emptySubscribe,
        () => true,  // client: always mounted
        () => false   // server: not mounted
    );
}