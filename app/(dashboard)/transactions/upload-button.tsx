
import  { Upload } from "lucide-react";
import { useCSVReader } from "react-papaparse";
import type { ParseResult } from "papaparse";

import { Button } from "@/components/ui/button";

type Props = {
    onUpload: (results: ParseResult<Record<string, unknown>>) => void | Promise<void>;
    disabled?: boolean;
};

export const UploadButton = ({ onUpload, disabled }: Props) => {
    const { CSVReader } = useCSVReader();
    //TODO paywall
    return (
       <CSVReader
        onUploadAccepted={onUpload}
        config={{
            header: true,
            skipEmptyLines: true,
        }}
       >
       {({getRootProps }: {getRootProps: () => Record<string, unknown>}) => (
        <Button size="sm" variant="outline" disabled={disabled} className="w-full lg:w-auto" {...getRootProps()}>
            <Upload className="mr-2 h-4 w-4" />
            Import
        </Button>
       )} 
       </CSVReader>
    )
};