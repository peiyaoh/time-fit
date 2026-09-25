import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import UserInfoHelper from "@time-fit/helper/UserInfoHelper.js";

export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. "Sign in with...")
      name: "ParticipantID",
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        username: {
          label: "ParticipantID",
          type: "text",
          placeholder: "Enter your participant ID",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Enter your 8-digit token",
        },
      },

      async authorize(credentials, req) {
        //const user = { id: 1, name: "J Smith", email: "jsmith@example.com", username: "test1", password: "test1" };

        const user = await UserInfoHelper.getUserInfoByUsername(credentials.username);

        if (user == null) {
          console.log(`No such user`);
          return null;
        }
        else {
          let compareResult = await bcrypt.compare(credentials.password, user.password).then((result) => {
            return result;
          });

          if (compareResult) {
            // Any object returned will be saved in `user` property of the JWT

            return {
              name: credentials.username
            };
            // return username
            //return { email: user.username };
          }
          else {
            // If you return null then an error will be displayed advising the user to check their details.
            console.log(`Credentials issue`);
            return null;

            // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter
          }
        }
      },


      /*
      callbacks: {
        async session({ session, token }) {
          console.log(`callbacks.session`);
          session.user = token.user;
          return session;
        },
        async jwt({ token, user }) {
          console.log(`callbacks.jwt`);
          if (user) {
            token.user = user;
          }
          return token;
        },
      },
      */
    }),
  ],
  theme: {
    colorScheme: "light", // "auto" | "dark" | "light"
    brandColor: "#E87667", // Hex color code
    logo: "/image/svg/login-icon.svg", // Absolute URL to image
    buttonText: ""  // Hex color code
  }
  /*
  session: {
    jwt: true,
    maxAge: 30 * 24 * 60 * 60,
  },
  jwt: {
    signingKey: "lXSW+g0cDZ4Y19NvZPrsDzIFF787vhRluTWC5igNxKY=",
  },
  */
};

export default NextAuth(authOptions);