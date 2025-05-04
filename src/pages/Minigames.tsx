
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LockpickGame from "@/components/minigames/LockpickGame";

export default function Minigames() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6 text-guild-primary">Minigames</h1>
      
      <Card className="bg-guild-surface/80 backdrop-blur-sm border border-guild-primary/20">
        <CardHeader className="pb-0">
          <CardTitle className="text-2xl font-semibold text-guild-primary">Treinamento de Habilidades</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="lockpick">
            <TabsList className="mb-6 bg-guild-dark/60">
              <TabsTrigger value="lockpick">Lockpick Challenge</TabsTrigger>
            </TabsList>
            
            <TabsContent value="lockpick" className="mt-4">
              <LockpickGame />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
