
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import LockpickGame from "@/components/minigames/LockpickGame";

export default function Minigames() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6 text-guild-primary">Minigames</h1>
      
      <Card className="bg-guild-surface/80 backdrop-blur-sm border border-guild-primary/20">
        <CardContent className="p-6">
          <Tabs defaultValue="lockpick">
            <TabsList className="mb-6 bg-guild-dark/60">
              <TabsTrigger value="lockpick">Lockpick Challenge</TabsTrigger>
            </TabsList>
            
            <TabsContent value="lockpick">
              <LockpickGame />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
