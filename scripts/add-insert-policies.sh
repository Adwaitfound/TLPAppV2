#!/bin/bash

echo "📤 Pushing INSERT policy migration..."
echo ""
echo "This will allow client signups to work."
echo ""

supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ INSERT policies added successfully!"
    echo "Clients can now register!"
else
    echo "❌ Failed to push migration"
    exit 1
fi
