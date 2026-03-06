"use client";


import { Loader2, Plus } from "lucide-react";
import { useNewCategory } from "@/features/categories/hooks/use-new-category";
import { useGetCategories } from "@/features/categories/api/use-get-categories";
import { columns } from "./columns";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useBulkDeleteCategories } from "@/features/categories/api/use-bulk-delete-categories";


const CategoriesPage = () => {
    const newCategory = useNewCategory();
    const deleteCategories = useBulkDeleteCategories();
    const categoriesQuery = useGetCategories();
    const categories = categoriesQuery.data || [];

    const isDisable = 
    categoriesQuery.isLoading || deleteCategories.isPending

    if (categoriesQuery.isLoading) {
        return (
            <Card className="border-none drop-shadow-sm">
                <CardHeader >
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                    <div className="w-full h-125 flex items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-slate-400" />
                    </div>
                </CardContent>
            </Card>
        );
    }

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
        <Card className="border-none drop-shadow-sm">
            <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle>
                    Categories Page
                </CardTitle>
                <Button size="sm" onClick={newCategory.onOpen}>
                    <Plus className="size-4 mr-2"/>
                    Add Category
                </Button>   
            </CardHeader>
            <CardContent>
                <DataTable 
                columns={columns}
                data={categories}
                filterKey="name"
                onDelete={(row) => {
                    const ids = row.map((r) => r.id);
                    deleteCategories.mutate({ ids });
                }}
                disable={isDisable}
             />
            </CardContent>
        </Card>
    </div>
  );
};

export default CategoriesPage;