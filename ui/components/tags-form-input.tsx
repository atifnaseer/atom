import { type Tag, TagInput } from "emblor";
import { type Dispatch, type SetStateAction, useState } from "react";
import { useT } from "@/components/ejad/i18n-provider";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

export function TagsFormInput({
  newTags,
  setTags,
  field,
  label = "Tags",
  placeholder = "Enter tags",
  allowDuplicates,
  className,
}: {
  newTags: Tag[];
  setTags: Dispatch<SetStateAction<Tag[]>>;
  // biome-ignore lint: field can be of type any
  field: any;
  label?: string;
  placeholder?: string;
  allowDuplicates?: boolean;
  className?: string;
}) {
  const t = useT();
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);

  return (
    <FormItem className="flex flex-col items-start">
      <FormLabel className="text-start">{label}</FormLabel>
      <FormControl className="w-full">
        <TagInput
          {...field}
          placeholder={placeholder}
          tags={newTags}
          setTags={(updatedTags) => {
            setTags(updatedTags);
          }}
          showCounter={true}
          name="tags"
          shape="rounded"
          truncate={45}
          className="ps-2"
          styleClasses={{
            tagList: {
              container: cn(className, "p-2"),
            },
          }}
          activeTagIndex={activeTagIndex}
          setActiveTagIndex={setActiveTagIndex}
          allowDuplicates={allowDuplicates}
          inlineTags={false}
          inputFieldPosition="top"
        />
      </FormControl>
      <FormDescription className="text-xs text-muted-foreground">
        {t("tags.hint", { label: label.toLowerCase() })}
      </FormDescription>
      <FormMessage />
    </FormItem>
  );
}
