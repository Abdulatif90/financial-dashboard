"use client"

import { useOpenCategory } from "@/features/categories/hooks/use-open-category";
import { Edit, MoreHorizontal, Trash } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"  
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";
import { useDeleteCategory } from "@/features/categories/api/use-delete-category";


type Props = {
    id: string;
}

export const Actions = ({ id }: Props) => {
    const [ ConfirmDialog, confirm ] = useConfirm(
        "Are you sure?",
        "You are about to delete this category."
    );

    const deleteMutation = useDeleteCategory(id);
    const { onOpen, onClose } = useOpenCategory();

    const handleDelete = async () => {
        const confirmed = await confirm();
        if (confirmed) {
            deleteMutation.mutate(
                undefined,
                {
                    onSuccess: () => { 
                        onClose();
                     },
                }
            );
        }   
    };
    return (
        <>
        <ConfirmDialog />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        disabled={deleteMutation.isPending}
                        onClick={() => onOpen(id)}
                    >
                        <Edit className="size-4 mr-2" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={deleteMutation.isPending}
                        onClick={handleDelete}
                    >
                        <Trash className="size-4 mr-2" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
