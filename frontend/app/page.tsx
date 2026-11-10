import Image from "next/image";
import { Hero } from "@/modules/beranda/index";
import { Welcome } from "@/modules/welcome";
export default function Home() {
  return (
    <>
      <Welcome />
      <Hero />
    </>
  );
}
