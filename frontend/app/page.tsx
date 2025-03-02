import { ClassCard } from "@/components/class-card";
import { CreateClassButton } from "@/components/create-class-button";
import { Button } from "@/components/ui/button";
import { BookOpen, Grid2X2, List, Settings } from "lucide-react";
import { getClasses } from "@/lib/storage";

export default async function Home() {
  const classes = await getClasses();
  
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* Header */}
        <header className="flex justify-between items-center py-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            <h1 className="text-2xl font-bold">ExamAI</h1>
          </div>
          <Button variant="outline" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </header>

        {/* Main content */}
        <div className="py-8">
          <h1 className="text-4xl font-bold mb-12">Welcome to ExamAI</h1>
          
          <div className="flex justify-between items-center mb-6">
            <CreateClassButton />
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="active">
                <Grid2X2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <List className="h-5 w-5" />
              </Button>
              <Button variant="outline" className="ml-2">
                Most recent
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem) => (
              <ClassCard key={classItem.id} classItem={classItem} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}