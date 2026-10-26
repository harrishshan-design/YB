import { AuthScreen } from "@/components/product/AuthScreen";
export default async function Join({params}:{params:Promise<{code:string}>}){return <AuthScreen register invite={(await params).code}/>;}
