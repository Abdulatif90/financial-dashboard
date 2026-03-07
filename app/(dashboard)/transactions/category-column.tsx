import { useOpenCategory } from "@/features/categories/hooks/use-open-category";
import { useOpenTransaction } from "@/features/transactions/hooks/use-open-transaction";
import { TriangleAlert } from "lucide-react";


type Props = {
    id: string;
    category: string | null;
    categoryId: string | null;
};

export const CategoryColumn = ({ 
    id,
    category, 
    categoryId, 
     }: Props) => {
        const { onOpen: onOpenCategory } = useOpenCategory();
        const { onOpen: onOpenTransaction } = useOpenTransaction();
        const onClick = () => {
            if (categoryId) {
                onOpenCategory(categoryId);
            } else {
                onOpenTransaction(id);
            }
        }
        return (
            <div 
            onClick={onClick}
            className="flex items-center cursor-pointer hover:underline "
            >
                {!category && <TriangleAlert className="size-4 text-rose-500 mr-1" />}
                {category || "No category"}
            </div>
        );
    };
