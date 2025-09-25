// components/Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import styles from "../styles/Chart.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
);

export default function Chart({ type = "bar", data, options }) {
  if (type === "line") return <Line data={data} options={options} className={styles.chart} />;
  if (type === "doughnut") return <Doughnut data={data} options={options} className={styles.chart} />;
  return <Bar data={data} options={options} className={styles.chart} />;
}
