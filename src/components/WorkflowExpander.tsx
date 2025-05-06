import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Image from "next/image";

export default function WorkflowExpander() {
  return (
    <Accordion type="single" collapsible className="mb-6">
      <AccordionItem value="workflow">
        <AccordionTrigger>MolConSUL Workflow</AccordionTrigger>
        <AccordionContent>
          <Image
            src="/Workflow.png"
            alt="MolConSUL Workflow"
            width={900}
            height={600}
            className="mx-auto"
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}