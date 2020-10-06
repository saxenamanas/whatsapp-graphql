import { GraphQLServer } from 'graphql-yoga'
import { PubSub } from 'graphql-subscriptions';
import mongoose from 'mongoose';
import User from './schemas/User';
import Chat from './schemas/Chats';

const url = 'mongodb+srv://manas:manas@cluster0.2nkag.mongodb.net/<dbname>?retryWrites=true&w=majority';

mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true});

const pubsub = new PubSub();

let num = 0;

const typeDefs = `
  type Query {
    getUsers(current:String!):[User!]
    chatHistory(first:String!,second:String!):[ChatMessage]!
  }
  type Mutation{
    createUser(data:createUserInput!):User!
    sendMessage(msg:String!,participants:String!,sender:String!):String!
  }
  type Subscription{
    changeNum(name:String!):Int
    chatHistory(participants:String!):[ChatMessage]
  }
  type User{
    name:String!
    email:String!
    id:ID!
  }
  input createUserInput{
    name:String!
    email:String!
  }
  type ChatMessage{
    sender:String!
    msg:String!
    time:String
  }
`

const resolvers = {
  Query: {
    async getUsers(p,{current}){
      const users = await User.find({});
      console.log(users);
      let filtered = users.filter((user)=>{
        return user._id!=current
      })
      return filtered;
    },
    async chatHistory(parent,{first,second},ctx,info){
      let id = '';
      if(first>second)
        id = second+first
      else
        id = first+second
      console.log('Finding for '+id);
      const val = await Chat.findOne({participants:id});
      if(val==null){
        const chat = new Chat({
          participants:id,
          chatHistory:[]
        });
        await chat.save();
        return chat.chatHistory;
      }
      return val.chatHistory;
    }
  },
  Mutation:{
    async createUser(parent,{data},ctx,info){
      const {email , name } = data;
      const user = new User({email,name});
      const isMatch = await User.find({email});
      if(isMatch.length!=0)
        {
          console.log(isMatch)
          return {
            email:isMatch[0].email,
            name:isMatch[0].name,
            id:isMatch[0]._id
          }
        }
      await user.save();
      return {
        email,
        name,
        id:user._id
      }
    },
    async sendMessage(parent,{msg,participants,sender},ctx,info){
      var time = new Date();
      await Chat.update({
        participants
      },
      {$push:{chatHistory:{msg,time,sender}}});
      const updated = await Chat.findOne({participants});
      pubsub.publish(participants,{chatHistory:updated.chatHistory});
      return msg;
    }
  },
  Subscription: {
    changeNum: {
      subscribe(p,a,c,i) {
        console.log(a);
        return pubsub.asyncIterator('num')
      }
    },
    chatHistory:{
      subscribe(p,{participants}){
        return pubsub.asyncIterator(participants)
      }
    }
  }
}

const server = new GraphQLServer({ typeDefs, resolvers })
server.start({port:process.env.PORT || 4000},() => console.log('Server is running on localhost:4000'))