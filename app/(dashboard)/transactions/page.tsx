"use client";

import { Suspense, useState } from "react";
import type { ParseError, ParseResult } from "papaparse";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";


import { Loader2, Plus } from "lucide-react";
import { useNewTransaction } from "@/features/transactions/hooks/use-new-transaction";
import { useGetTransactions } from "@/features/transactions/api/use-get-transactions";
import { useBulkDeleteTransactions } from "@/features/transactions/api/use-bulk-delete-transactions";
import { useBulkCreateTransaction } from "@/features/transactions/api/use-bulk-create-transactions";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import { useGetCategories } from "@/features/categories/api/use-get-categories";
import { columns } from "./columns";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadButton } from "./upload-button";
import { client } from "@/lib/hono";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type CsvRow = Record<string, unknown>;

type ParsedImportRow = {
    rowNumber: number;
    date: string;
    account: string;
    category: string;
    payee: string;
    amount: string;
    notes: string;
    status: "ready" | "error";
    message: string;
    accountMatch: "existing" | "new";
    categoryMatch: "existing" | "new" | "empty";
    normalized?: {
        date: Date;
        accountName: string;
        categoryName: string | null;
        payee: string;
        amount: number;
        notes: string | null;
    };
};

type ImportPreview = {
    rows: ParsedImportRow[];
    validCount: number;
    errorCount: number;
    parseErrors: ParseError[];
};

type ImportSummary = {
    importedCount: number;
    skippedCount: number;
    createdAccountsCount: number;
    createdCategoriesCount: number;
};

const REQUIRED_IMPORT_FIELDS = ["date", "account", "payee", "amount"] as const;

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, "");
const amountFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
});

const getCsvValue = (row: CsvRow, aliases: string[]) => {
    const normalizedAliases = aliases.map(normalizeHeader);

    for (const [key, value] of Object.entries(row)) {
        if (normalizedAliases.includes(normalizeHeader(key))) {
            if (typeof value === "string") {
                return value.trim();
            }

            if (value == null) {
                return "";
            }

            return String(value).trim();
        }
    }

    return "";
};

const normalizeName = (value: string) => value.trim().toLowerCase();

const parseCsvAmount = (value: string) => {
    const sanitizedValue = value.replace(/[$,\s]/g, "");
    const normalizedValue = sanitizedValue.startsWith("(") && sanitizedValue.endsWith(")")
        ? `-${sanitizedValue.slice(1, -1)}`
        : sanitizedValue;
    const parsedAmount = Number(normalizedValue);

    if (!Number.isFinite(parsedAmount)) {
        throw new Error(`Invalid amount: ${value}`);
    }

    return parsedAmount;
};

const parseCsvDate = (value: string) => {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date: ${value}`);
    }

    return parsedDate;
};

const formatMissingFieldsError = (fields: string[]) => {
    if (fields.length === 1) {
        return `${fields[0]} is required.`;
    }

    return `Required fields are missing: ${fields.join(", ")}.`;
};

const buildImportPreview = (
    rows: CsvRow[],
    accountNames: Set<string>,
    categoryNames: Set<string>,
    parseErrors: ParseError[]
): ImportPreview => {
    const parsedRows = rows.map<ParsedImportRow>((row, index) => {
        const rowNumber = index + 1;
        const dateValue = getCsvValue(row, ["date", "transactiondate"]);
        const accountName = getCsvValue(row, ["account", "accountname"]);
        const categoryName = getCsvValue(row, ["category", "categoryname"]);
        const payee = getCsvValue(row, ["payee", "description", "merchant"]);
        const amountValue = getCsvValue(row, ["amount", "value"]);
        const notes = getCsvValue(row, ["notes", "note", "memo"]);

        try {
            const missingFields = REQUIRED_IMPORT_FIELDS.filter((field) => {
                if (field === "date") {
                    return !dateValue;
                }

                if (field === "account") {
                    return !accountName;
                }

                if (field === "payee") {
                    return !payee;
                }

                return !amountValue;
            });

            if (missingFields.length > 0) {
                throw new Error(formatMissingFieldsError(missingFields.map((field) => field[0].toUpperCase() + field.slice(1))));
            }

            const normalizedDate = parseCsvDate(dateValue);
            const normalizedAmount = parseCsvAmount(amountValue);
            const accountMatch = accountNames.has(normalizeName(accountName)) ? "existing" : "new";
            const categoryMatch = !categoryName
                ? "empty"
                : categoryNames.has(normalizeName(categoryName))
                    ? "existing"
                    : "new";

            return {
                rowNumber,
                date: dateValue,
                account: accountName,
                category: categoryName,
                payee,
                amount: amountValue,
                notes,
                status: "ready",
                message: "Ready to import",
                accountMatch,
                categoryMatch,
                normalized: {
                    date: normalizedDate,
                    accountName,
                    categoryName: categoryName || null,
                    payee,
                    amount: normalizedAmount,
                    notes: notes || null,
                },
            };
        } catch (error) {
            return {
                rowNumber,
                date: dateValue,
                account: accountName,
                category: categoryName,
                payee,
                amount: amountValue,
                notes,
                status: "error",
                message: error instanceof Error ? error.message : "Invalid row",
                accountMatch: accountName ? (accountNames.has(normalizeName(accountName)) ? "existing" : "new") : "new",
                categoryMatch: !categoryName
                    ? "empty"
                    : categoryNames.has(normalizeName(categoryName))
                        ? "existing"
                        : "new",
            };
        }
    });

    return {
        validCount: parsedRows.filter((row) => row.status === "ready").length,
        errorCount: parsedRows.filter((row) => row.status === "error").length + parseErrors.length,
        parseErrors,
        rows: parsedRows,
    };
};

const TransactionsPageContent = () => {
    const [isImporting, setIsImporting] = useState(false);
    const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
    const [lastImportSummary, setLastImportSummary] = useState<ImportSummary | null>(null);
    const queryClient = useQueryClient();

    const newTransaction = useNewTransaction();
    const deleteTransactions = useBulkDeleteTransactions();
    const bulkCreateTransactions = useBulkCreateTransaction();
    const transactionsQuery = useGetTransactions();
    const accountsQuery = useGetAccounts();
    const categoriesQuery = useGetCategories();
    const transactions = transactionsQuery.data || [];
    const previewRows = importPreview?.rows ?? [];
    const previewValidCount = importPreview?.validCount ?? 0;
    const previewErrorCount = importPreview?.errorCount ?? 0;
    const previewParseErrors = importPreview?.parseErrors ?? [];
    const previewRowErrors = previewRows.filter((row) => row.status === "error");
    const previewErrorDetails = [
        ...previewRowErrors.map((row) => ({
            rowNumber: row.rowNumber,
            message: row.message,
        })),
        ...previewParseErrors.map((error) => ({
            rowNumber: typeof error.row === "number" ? error.row + 1 : null,
            message: error.message,
        })),
    ];
    const problemRowNumbers = Array.from(
        new Set(
            previewErrorDetails
                .map((error) => error.rowNumber)
                .filter((rowNumber): rowNumber is number => rowNumber !== null)
        )
    ).sort((left, right) => left - right);

    const isDisable = 
    transactionsQuery.isLoading ||
    deleteTransactions.isPending ||
    bulkCreateTransactions.isPending ||
    isImporting;

    const handleUpload = async (results: ParseResult<CsvRow>) => {
        const rows = results.data.filter((row) =>
            Object.values(row).some((value) => String(value ?? "").trim() !== "")
        );

        if (!rows.length) {
            toast.error("CSV file is empty.");
            return;
        }

        const preview = buildImportPreview(
            rows,
            new Set((accountsQuery.data ?? []).map((account) => normalizeName(account.name))),
            new Set((categoriesQuery.data ?? []).map((category) => normalizeName(category.name))),
            results.errors
        );

        setImportPreview(preview);
        setLastImportSummary(null);

        if (preview.validCount === 0) {
            toast.error("CSV rows contain errors. Fix them and upload again.");
            return;
        }

        if (preview.errorCount > 0) {
            toast.warning(`${preview.validCount} rows are ready. ${preview.errorCount} rows have errors.`);
            return;
        }

        toast.success(`${preview.validCount} rows are ready to import.`);
    };

    const handleImport = async () => {
        if (!importPreview || previewValidCount === 0) {
            toast.error("There are no valid rows to import.");
            return;
        }

        const accountMap = new Map(
            (accountsQuery.data ?? []).map((account) => [normalizeName(account.name), account.id])
        );
        const categoryMap = new Map(
            (categoriesQuery.data ?? []).map((category) => [normalizeName(category.name), category.id])
        );

        let createdAccountsCount = 0;
        let createdCategoriesCount = 0;

        try {
            setIsImporting(true);

            const payload = [];

            for (const row of previewRows) {
                if (row.status !== "ready" || !row.normalized) {
                    continue;
                }

                const normalizedAccountName = normalizeName(row.normalized.accountName);
                let accountId = accountMap.get(normalizedAccountName);

                if (!accountId) {
                    const response = await client.api.accounts.$post({
                        json: { name: row.normalized.accountName },
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to create account \"${row.normalized.accountName}\".`);
                    }

                    const { data } = await response.json();
                    accountId = data.id;
                    accountMap.set(normalizedAccountName, accountId);
                    createdAccountsCount += 1;
                }

                let categoryId: string | null = null;
                if (row.normalized.categoryName) {
                    const normalizedCategoryName = normalizeName(row.normalized.categoryName);
                    categoryId = categoryMap.get(normalizedCategoryName) ?? null;

                    if (!categoryId) {
                        const response = await client.api.categories.$post({
                            json: { name: row.normalized.categoryName },
                        });

                        if (!response.ok) {
                            throw new Error(`Failed to create category \"${row.normalized.categoryName}\".`);
                        }

                        const { data } = await response.json();
                        categoryId = data.id;
                        categoryMap.set(normalizedCategoryName, categoryId);
                        createdCategoriesCount += 1;
                    }
                }

                payload.push({
                    date: row.normalized.date,
                    accountId,
                    categoryId,
                    payee: row.normalized.payee,
                    amount: row.normalized.amount,
                    notes: row.normalized.notes,
                });
            }

            await bulkCreateTransactions.mutateAsync(payload);

            if (createdAccountsCount > 0) {
                queryClient.invalidateQueries({ queryKey: ["accounts"] });
            }

            if (createdCategoriesCount > 0) {
                queryClient.invalidateQueries({ queryKey: ["categories"] });
            }

            setLastImportSummary({
                importedCount: payload.length,
                skippedCount: previewErrorCount,
                createdAccountsCount,
                createdCategoriesCount,
            });
            setImportPreview(null);

            toast.success(`${payload.length} transactions imported successfully.`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to import CSV.");
        } finally {
            setIsImporting(false);
        }
    };

    if (transactionsQuery.isLoading) {
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
        {importPreview && (
            <Card className="mb-6 border-none drop-shadow-sm">
                <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <CardTitle>Import preview</CardTitle>
                        <CardDescription>
                            Review CSV rows before saving them to transactions.
                        </CardDescription>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">Ready: {previewValidCount}</Badge>
                            <Badge variant={previewErrorCount > 0 ? "destructive" : "outline"}>
                                Errors: {previewErrorCount}
                            </Badge>
                            <Badge variant="outline">Total: {previewRows.length}</Badge>
                        </div>
                        {previewErrorDetails.length > 0 && (
                            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                                <div className="mb-2 text-sm font-medium text-destructive">
                                    Problem rows
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {problemRowNumbers.map((rowNumber) => (
                                        <Badge key={`problem-row-${rowNumber}`} variant="destructive">
                                            {`Row ${rowNumber}`}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setImportPreview(null)}
                            disabled={isImporting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={isImporting || previewValidCount === 0}
                        >
                            {isImporting ? "Importing..." : `Import ${previewValidCount} rows`}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {previewErrorDetails.length > 0 && (
                        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-4">
                            <div className="mb-2 text-sm font-medium text-destructive">
                                Error details
                            </div>
                            <div className="space-y-1 text-sm text-destructive">
                                {previewErrorDetails.map((error, index) => (
                                    <div key={`error-detail-${error.rowNumber}-${index}`}>
                                        {error.rowNumber ? `Row ${error.rowNumber}: ` : ""}{error.message}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="overflow-hidden rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Row</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Payee</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {previewRows.map((row) => (
                                    <TableRow
                                        key={`${row.rowNumber}-${row.payee}-${row.amount}`}
                                        className={cn(
                                            row.status === "error" && "bg-destructive/5 hover:bg-destructive/10"
                                        )}
                                    >
                                        <TableCell className={cn(row.status === "error" && "font-medium text-destructive")}>{row.rowNumber}</TableCell>
                                        <TableCell>
                                            {row.normalized
                                                ? format(row.normalized.date, "dd MMM yyyy")
                                                : row.date || "-"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span>{row.account || "-"}</span>
                                                <Badge variant="outline">{row.accountMatch}</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span>{row.category || "-"}</span>
                                                <Badge variant="outline">{row.categoryMatch}</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>{row.payee || "-"}</TableCell>
                                        <TableCell>
                                            {row.normalized
                                                ? amountFormatter.format(row.normalized.amount)
                                                : row.amount || "-"}
                                        </TableCell>
                                        <TableCell>{row.notes || "-"}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge variant={row.status === "ready" ? "secondary" : "destructive"}>
                                                    {row.status}
                                                </Badge>
                                                <span className={cn(
                                                    "text-xs",
                                                    row.status === "error" ? "text-destructive" : "text-muted-foreground"
                                                )}>
                                                    {row.message}
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        )}

        {lastImportSummary && (
            <Card className="mb-6 border-none drop-shadow-sm">
                <CardHeader>
                    <CardTitle>Last import</CardTitle>
                    <CardDescription>
                        {lastImportSummary.importedCount} rows imported successfully.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">Imported: {lastImportSummary.importedCount}</Badge>
                        <Badge variant="outline">Skipped: {lastImportSummary.skippedCount}</Badge>
                        <Badge variant="outline">Accounts created: {lastImportSummary.createdAccountsCount}</Badge>
                        <Badge variant="outline">Categories created: {lastImportSummary.createdCategoriesCount}</Badge>
                    </div>
                </CardContent>
            </Card>
        )}

        <Card className="border-none drop-shadow-sm">
            <CardHeader className="flex flex-col gap-y-2 lg:mt-4 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle>
                    Transactions history
                </CardTitle>
                <div className="flex flex-col gap-2 lg:flex-row">    
                <Button size="sm" onClick={newTransaction.onOpen}>
                    <Plus className="size-4 mr-2"/>
                    Add transaction
                </Button>
                <UploadButton 
                onUpload={handleUpload}
                disabled={isDisable || accountsQuery.isLoading || categoriesQuery.isLoading}
                />   
                </div>
            </CardHeader>
            <CardContent>
                <DataTable 
                columns={columns}
                data={transactions}
                filterKey="payee"
                onDelete={(row) => {
                    const ids = row.map((r) => r.id);
                    deleteTransactions.mutate({ ids });
                }}
                disable={isDisable}
             />
            </CardContent>
        </Card>
    </div>
  );
};

const TransactionsPage = () => {
    return (
        <Suspense fallback={null}>
            <TransactionsPageContent />
        </Suspense>
    );
};

export default TransactionsPage;