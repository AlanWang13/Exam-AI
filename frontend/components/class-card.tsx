"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Class } from "@/types";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { Button } from "./ui/button";

interface ClassCardProps {
  classItem: Class;
}

export function ClassCard({ classItem }: ClassCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/class/${classItem.id}`);
  };

  return (
    <Card 
      className="overflow-hidden transition-all hover:shadow-md cursor-pointer bg-card"
      onClick={handleClick}
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div className="text-4xl">{classItem.emoji}</div>
          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
        <div className="px-4 pb-2">
          <h3 className="font-semibold text-lg line-clamp-2">{classItem.title}</h3>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-2 text-sm text-muted-foreground">
        {classItem.createdAt} · {classItem.sourcesCount} sources
      </CardFooter>
    </Card>
  );
}