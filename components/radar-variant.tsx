
import {
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer
} from "recharts";

type Props = {
    data?: {
        name: string;
        value: number;
    }[]
}

export const RadarVariant = ({ data = [] }: Props) => {
    return (
        <ResponsiveContainer width="100%" height={300} >
            <RadarChart 
                cx="50%"
                cy="50%"
                outerRadius="80%"
                data={data} >
                <PolarGrid />
                <PolarAngleAxis dataKey="name" style={{ fontSize: "12px "}} />
                <PolarRadiusAxis  style={{ fontSize: "12px "}} />
                <Radar
                    name="Spending"
                    dataKey="value"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                />
            </RadarChart>
        </ResponsiveContainer>
    );
}