import { JSX, useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,  
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";


export const useConfirm = (
    title: string,   
    message: string,
) : [() => JSX.Element, () => Promise<boolean>] => {
    const [ promise, setPromise ] = useState<{
        resolve: (value: boolean) => void,
        reject: (reason?: unknown) => void
    } | null>(null);

    const confirm = () => new Promise<boolean>((resolve, reject) => {
        setPromise({ resolve, reject });
    });

    const handleClose = () => {
        setPromise(null);
    };

    const handleConfirm = () => {
        promise?.resolve(true);
        handleClose();
    };

    const handleCancel = () => {
        promise?.resolve(false);
        handleClose();
    };

    const ConfirmDialog = () => (
        <Dialog open={!!promise} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{message}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={handleCancel}>Cancel</Button>
                    <Button onClick={handleConfirm}>Confirm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    return [ConfirmDialog, confirm];
};
