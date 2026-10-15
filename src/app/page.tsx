import { redirect } from "next/navigation";

// De momento la única pantalla de trabajo es el inventario; el tablero de pedidos la sustituirá como inicio.
export default function Home() {
  redirect("/inventario");
}
